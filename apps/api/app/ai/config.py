import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseSettings):
    LLM_PROVIDER: str = "openai"  # openai, mock, local
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: Optional[str] = None
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 1500

    MAX_TOOL_CALLS_PER_REQUEST: int = 5
    MAX_CONVERSATION_HISTORY_MESSAGES: int = 10
    MAX_TRANSACTION_SEARCH_LIMIT: int = 20

    RAG_TOP_K: int = 3
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_configured(self) -> bool:
        if self.LLM_PROVIDER == "mock":
            return True
        return bool(self.LLM_API_KEY)


ai_settings = AISettings()
