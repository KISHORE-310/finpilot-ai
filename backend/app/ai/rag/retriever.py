import re
from typing import List, Tuple
from app.ai.rag.documents import KnowledgeDocument
from app.ai.rag.ingestion import load_knowledge_documents
from app.ai.schemas.chat import Citation

STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has",
    "had", "do", "does", "did", "how", "what", "why", "when", "where", "who", "which",
    "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
    "my", "your", "his", "her", "its", "our", "their", "me", "him", "us", "them",
    "can", "could", "would", "should", "will"
}


class FinancialKnowledgeRetriever:
    def __init__(self):
        self.documents: List[KnowledgeDocument] = load_knowledge_documents()

    def retrieve(self, query: str, top_k: int = 2) -> List[Tuple[KnowledgeDocument, float]]:
        """
        Deterministic keyword & topic similarity retriever for curated knowledge base with stop-word filtering.
        """
        if not self.documents:
            return []

        query_terms = {w for w in re.findall(r"\w+", query.lower()) if len(w) > 2 and w not in STOP_WORDS}
        if not query_terms:
            return []

        scored: List[Tuple[KnowledgeDocument, float]] = []

        for doc in self.documents:
            doc_terms = set(re.findall(r"\w+", doc.content.lower() + " " + doc.topic.lower() + " " + doc.title.lower()))
            overlap = query_terms.intersection(doc_terms)
            if overlap:
                score = len(overlap) / (len(query_terms) + 1.0)
                # Boost if topic or title terms match
                title_overlap = query_terms.intersection(set(re.findall(r"\w+", doc.title.lower())))
                if title_overlap:
                    score += 0.5
                scored.append((doc, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def query_rag(self, query: str, top_k: int = 2) -> Tuple[str, List[Citation]]:
        matches = self.retrieve(query, top_k)
        if not matches:
            return ("No specific educational knowledge documents matched this query.", [])

        context_blocks = []
        citations: List[Citation] = []

        for doc, score in matches:
            context_blocks.append(f"### {doc.title} ({doc.topic})\nSource: {doc.source}\n{doc.content}")
            citations.append(
                Citation(
                    topic=doc.topic,
                    title=doc.title,
                    source=doc.source,
                    source_url=getattr(doc, "source_url", None),
                    snippet=doc.content[:160].strip() + "...",
                )
            )

        context_str = "\n\n".join(context_blocks)
        return context_str, citations
