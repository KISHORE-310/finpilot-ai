import time
import uuid
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Set, Union
import bcrypt
import jwt
from app.core.config import settings


class TokenBlacklist:
    """Thread-safe in-memory revoked token storage with TTL eviction."""

    def __init__(self):
        self._revoked_tokens: Dict[str, float] = {}  # token/jti -> expiry_timestamp
        self._lock = threading.Lock()

    def revoke(self, identifier: str, expires_at: Optional[float] = None) -> None:
        if not identifier:
            return
        now = time.time()
        # Default to 24h retention if expiry not specified
        exp = expires_at if expires_at and expires_at > now else now + 86400
        with self._lock:
            self._cleanup_expired()
            self._revoked_tokens[identifier] = exp

    def is_revoked(self, identifier: str) -> bool:
        if not identifier:
            return False
        with self._lock:
            exp = self._revoked_tokens.get(identifier)
            if exp is None:
                return False
            if exp < time.time():
                del self._revoked_tokens[identifier]
                return False
            return True

    def _cleanup_expired(self) -> None:
        now = time.time()
        expired_keys = [k for k, exp in self._revoked_tokens.items() if exp < now]
        for k in expired_keys:
            del self._revoked_tokens[k]

    def clear(self) -> None:
        with self._lock:
            self._revoked_tokens.clear()


token_blacklist = TokenBlacklist()


def revoke_token(token_or_jti: str, exp: Optional[float] = None) -> None:
    token_blacklist.revoke(token_or_jti, exp)


def is_token_revoked(token_or_jti: str) -> bool:
    return token_blacklist.is_revoked(token_or_jti)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    token_jti = str(uuid.uuid4())
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "nbf": now,
        "jti": token_jti,
        "type": "access",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    if not token or is_token_revoked(token):
        return None
    try:
        # Decode and verify signature, expiration, and claims
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_nbf": True,
                "require": ["exp", "iat", "sub"],
            }
        )
        # Verify issuer and audience if present in token
        if "iss" in payload and payload["iss"] != settings.JWT_ISSUER:
            return None
        if "aud" in payload and payload["aud"] != settings.JWT_AUDIENCE:
            return None
        # Verify token type
        if payload.get("type") and payload.get("type") != "access":
            return None
        # Verify JTI revocation
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            return None

        return payload
    except jwt.PyJWTError:
        return None
