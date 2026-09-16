from typing import Any, Optional
from fastapi import HTTPException, status


class FinPilotException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        code: Optional[str] = None,
        headers: Optional[dict] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.code = code or "FINPILOT_ERROR"


class EntityNotFoundException(FinPilotException):
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} with identifier {entity_id} not found.",
            code="ENTITY_NOT_FOUND",
        )


class DuplicateEntityException(FinPilotException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            code="DUPLICATE_ENTITY",
        )


class InvalidCredentialsException(FinPilotException):
    def __init__(self, detail: str = "Invalid email or password."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            code="INVALID_CREDENTIALS",
            headers={"WWW-Authenticate": "Bearer"},
        )


class UnauthorizedException(FinPilotException):
    def __init__(self, detail: str = "Could not validate credentials."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            code="UNAUTHORIZED",
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(FinPilotException):
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            code="FORBIDDEN",
        )


class FileValidationException(FinPilotException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            code="FILE_VALIDATION_ERROR",
        )
