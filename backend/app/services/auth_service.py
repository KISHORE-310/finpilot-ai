from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import DuplicateEntityException, InvalidCredentialsException
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse


class AuthService:
    def __init__(self, session: AsyncSession):
        self.user_repo = UserRepository(session)

    async def register(self, user_in: UserCreate) -> Token:
        existing = await self.user_repo.get_by_email(user_in.email)
        if existing:
            raise DuplicateEntityException(f"User with email {user_in.email} already exists.")

        user_dict = {
            "email": user_in.email.lower().strip(),
            "name": user_in.name.strip(),
            "password_hash": get_password_hash(user_in.password),
            "is_active": True,
        }
        user = await self.user_repo.create(user_dict)
        token = create_access_token(subject=user.id)
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    async def login(self, login_in: UserLogin) -> Token:
        user = await self.user_repo.get_by_email(login_in.email)
        if not user or not verify_password(login_in.password, user.password_hash):
            raise InvalidCredentialsException()

        if not user.is_active:
            raise InvalidCredentialsException("User account is deactivated.")

        token = create_access_token(subject=user.id)
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
