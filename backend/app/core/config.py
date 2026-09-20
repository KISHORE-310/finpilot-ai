import sys
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FinPilot AI API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Security — NO hardcoded defaults; production MUST supply these
    SECRET_KEY: str = "dev_secret_key_CHANGE_ME_in_production_use_32plus_random_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    JWT_ISSUER: str = "finpilot-ai"
    JWT_AUDIENCE: str = "finpilot-api"

    # Rate Limiting & Abuse Protection
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH_PER_MINUTE: int = 20
    RATE_LIMIT_AI_PER_MINUTE: int = 30
    RATE_LIMIT_IMPORT_PER_MINUTE: int = 15
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 120

    # Database — NO hardcoded credentials; dev defaults use localhost only
    DATABASE_URL: str = "postgresql+asyncpg://finpilot_user:change_me@localhost:5432/finpilot_db"
    SYNC_DATABASE_URL: str = "postgresql://finpilot_user:change_me@localhost:5432/finpilot_db"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # File Uploads
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_production_secrets(self) -> None:
        """Fail fast in production if critical secrets are missing or use dev defaults."""
        if self.ENVIRONMENT not in ("production", "prod"):
            return

        INSECURE_MARKERS = {
            "change_me",
            "dev_secret",
            "insecure_key",
            "placeholder",
            "your_secret",
            "dummy_key",
        }

        errors: List[str] = []

        # SECRET_KEY must be set and not a dev placeholder
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
            errors.append("SECRET_KEY must be at least 32 characters in production.")
        if any(m in self.SECRET_KEY.lower() for m in INSECURE_MARKERS):
            errors.append("SECRET_KEY appears to use an insecure dev placeholder. Set a strong random value.")

        # DATABASE_URL must not contain dev passwords
        if "change_me" in self.DATABASE_URL or "change_me" in self.SYNC_DATABASE_URL:
            errors.append("DATABASE_URL / SYNC_DATABASE_URL must not use dev placeholder passwords in production.")

        if errors:
            for err in errors:
                print(f"[STARTUP ERROR] {err}", file=sys.stderr)
            raise RuntimeError(
                "Production startup blocked: insecure or missing configuration. "
                "Check SECRET_KEY and DATABASE_URL environment variables."
            )


settings = Settings()
