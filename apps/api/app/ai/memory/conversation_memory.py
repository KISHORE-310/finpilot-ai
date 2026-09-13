import json
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from app.db.models.conversation import Conversation, Message
from app.ai.prompts.analyst_prompt import MASTER_SYSTEM_PROMPT
from app.ai.config import ai_settings


class ConversationMemoryManager:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_conversation(self, user_id: str, conversation_id: Optional[str] = None) -> Conversation:
        if conversation_id:
            stmt = select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
            res = await self.session.execute(stmt)
            conv = res.scalar_one_or_none()
            if conv:
                return conv

        # Create new
        new_conv = Conversation(
            user_id=user_id,
            title="Financial Analysis Session",
        )
        self.session.add(new_conv)
        await self.session.commit()
        await self.session.refresh(new_conv)
        return new_conv

    async def load_conversation_messages(self, conversation_id: str) -> List[BaseMessage]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        res = await self.session.execute(stmt)
        db_messages = list(res.scalars().all())

        # Trim to window limit
        trimmed = db_messages[-ai_settings.MAX_CONVERSATION_HISTORY_MESSAGES:]

        langchain_msgs: List[BaseMessage] = [SystemMessage(content=MASTER_SYSTEM_PROMPT)]
        for msg in trimmed:
            if msg.role == "user":
                langchain_msgs.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                langchain_msgs.append(AIMessage(content=msg.content))

        return langchain_msgs

    async def persist_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata_json=json.dumps(metadata) if metadata else None,
        )
        self.session.add(msg)
        await self.session.commit()
        await self.session.refresh(msg)
        return msg
