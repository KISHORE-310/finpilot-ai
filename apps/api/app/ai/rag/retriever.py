import re
from typing import List, Tuple
from app.ai.rag.documents import KnowledgeDocument
from app.ai.rag.ingestion import load_knowledge_documents
from app.ai.schemas.chat import Citation


class FinancialKnowledgeRetriever:
    def __init__(self):
        self.documents: List[KnowledgeDocument] = load_knowledge_documents()

    def retrieve(self, query: str, top_k: int = 2) -> List[Tuple[KnowledgeDocument, float]]:
        """
        Deterministic keyword & topic similarity retriever for curated knowledge base.
        """
        if not self.documents:
            return []

        query_terms = set(re.findall(r"\w+", query.lower()))
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
                    source_url=doc.source_url,
                    snippet=doc.snippet,
                )
            )

        return ("\n\n---\n\n".join(context_blocks), citations)

