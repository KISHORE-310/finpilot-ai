from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class KnowledgeDocument:
    id: str
    topic: str
    title: str
    source: str
    source_url: Optional[str]
    jurisdiction: str
    content: str
    snippet: str
