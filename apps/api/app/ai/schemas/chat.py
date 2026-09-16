from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Citation(BaseModel):
    topic: str
    title: str
    source: str
    source_url: Optional[str] = None
    snippet: Optional[str] = None


class KeyMetric(BaseModel):
    label: str
    value: str
    change: Optional[str] = None


class AIInsight(BaseModel):
    title: str
    description: str
    severity: str = "info"  # info, warning, critical


class ToolExecutionMetadata(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = {}
    status: str = "success"


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Natural language financial query")
    conversation_id: Optional[str] = Field(None, description="Optional conversation UUID to continue a thread")
    include_rag: bool = Field(True, description="Whether to include RAG knowledge retrieval")


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    response: str
    answer: str = ""
    key_metrics: List[KeyMetric] = []
    insights: List[AIInsight] = []
    citations: List[Citation] = []
    tools_used: List[str] = []
    guardrail_intervened: bool = False
    disclaimer: str = (
        "FinPilot AI provides personal financial analysis and educational information based on your recorded data. "
        "It does not provide certified financial, tax, legal, or investment advice."
    )

    @model_validator(mode="after")
    def sync_answer_and_response(self) -> "ChatResponse":
        if not self.answer and self.response:
            self.answer = self.response
        elif not self.response and self.answer:
            self.response = self.answer
        return self


class MessageItemResponse(BaseModel):
    id: str
    role: str
    content: str
    metadata_json: Optional[str] = None
    tools_used: List[str] = []
    citations: List[Dict[str, Any]] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ConversationListItem(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AIHealthResponse(BaseModel):
    enabled: bool
    provider: str
    model: str
    tools_count: int
    knowledge_docs_count: int
    rag_documents_count: int
    rate_limit_per_minute: int
