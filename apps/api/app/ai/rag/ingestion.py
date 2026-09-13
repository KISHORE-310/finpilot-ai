import os
from pathlib import Path
from typing import List
from app.ai.rag.documents import KnowledgeDocument

KNOWLEDGE_PATH = Path(__file__).parent.parent.parent.parent / "knowledge"


def load_knowledge_documents() -> List[KnowledgeDocument]:
    docs: List[KnowledgeDocument] = []
    if not KNOWLEDGE_PATH.exists():
        return docs

    for file_path in KNOWLEDGE_PATH.glob("*.md"):
        text = file_path.read_text(encoding="utf-8")
        # Parse frontmatter
        topic = "General Financial Education"
        title = file_path.stem.replace("_", " ").title()
        source = "Consumer Financial Education Resource"
        source_url = None
        jurisdiction = "General"
        content = text

        if text.startswith("---"):
            parts = text.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1]
                content = parts[2].strip()
                for line in frontmatter.splitlines():
                    if ":" in line:
                        k, v = line.split(":", 1)
                        k = k.strip().lower()
                        v = v.strip()
                        if k == "topic":
                            topic = v
                        elif k == "title":
                            title = v
                        elif k == "source":
                            source = v
                        elif k == "source_url":
                            source_url = v
                        elif k == "jurisdiction":
                            jurisdiction = v

        doc_id = file_path.stem
        snippet = content[:250].replace("#", "").strip() + "..."

        docs.append(
            KnowledgeDocument(
                id=doc_id,
                topic=topic,
                title=title,
                source=source,
                source_url=source_url,
                jurisdiction=jurisdiction,
                content=content,
                snippet=snippet,
            )
        )

    return docs
