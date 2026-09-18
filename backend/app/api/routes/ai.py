import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.conversation import Conversation, Message
from app.db.session import get_db
from app.ai.config import ai_settings
from app.ai.services.analyst_service import FinancialAnalystService
from app.ai.rag.ingestion import load_knowledge_documents
from app.ai.tools import get_financial_tools
from app.ai.schemas.chat import (
    AIHealthResponse,
    ChatRequest,
    ChatResponse,
    ConversationListItem,
    ConversationResponse,
    MessageItemResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Financial Analyst"])


def _to_message_item_response(m: Message) -> MessageItemResponse:
    tools_used = []
    citations = []
    if m.metadata_json:
        try:
            meta = json.loads(m.metadata_json)
            tools_used = meta.get("tools_used", [])
            citations = meta.get("citations", [])
        except (ValueError, TypeError):
            pass
    return MessageItemResponse(
        id=m.id,
        role=m.role,
        content=m.content,
        metadata_json=m.metadata_json,
        tools_used=tools_used,
        citations=citations,
        created_at=m.created_at,
    )


async def _get_owned_conversation(db: AsyncSession, conversation_id: str, user_id: str) -> Conversation:
    """Fetches a conversation that must belong to the current user, else raises 404."""
    stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.get("/health", response_model=AIHealthResponse)
async def get_ai_health():
    """Safe AI configuration health check without revealing secrets or keys."""
    docs = load_knowledge_documents()
    return AIHealthResponse(
        enabled=ai_settings.is_configured,
        provider=ai_settings.LLM_PROVIDER,
        model=ai_settings.LLM_MODEL,
        tools_count=len(get_financial_tools(session=None, user_id="")),
        knowledge_docs_count=len(docs),
        rag_documents_count=len(docs),
        rate_limit_per_minute=ai_settings.RATE_LIMIT_REQUESTS_PER_MINUTE,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_analyst(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Processes a natural language financial query using LangChain tool calling and deterministic grounding."""
    service = FinancialAnalystService(db)
    return await service.execute_chat(user_id=str(current_user.id), request=request)


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    title: str = Query("New Financial Analysis"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new conversation thread."""
    conv = Conversation(
        user_id=str(current_user.id),
        title=title,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[],
    )


@router.get("/conversations", response_model=List[ConversationListItem])
async def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists recent conversation threads for the authenticated user."""
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == str(current_user.id))
        .order_by(desc(Conversation.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    convs = list(res.scalars().all())

    items = []
    for c in convs:
        # count messages
        msg_stmt = select(Message).where(Message.conversation_id == c.id)
        msg_res = await db.execute(msg_stmt)
        msg_cnt = len(list(msg_res.scalars().all()))
        items.append(
            ConversationListItem(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=msg_cnt,
            )
        )
    return items


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves conversation thread with full message history."""
    conv = await _get_owned_conversation(db, conversation_id, str(current_user.id))

    # Load messages
    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = list(msg_res.scalars().all())

    return ConversationResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[_to_message_item_response(m) for m in messages],
    )


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageItemResponse])
async def list_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists messages for a conversation thread."""
    await _get_owned_conversation(db, conversation_id, str(current_user.id))

    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = list(msg_res.scalars().all())
    return [_to_message_item_response(m) for m in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=ChatResponse)
async def send_message_to_conversation(
    conversation_id: str,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sends a message within an existing conversation thread."""
    # Verify ownership
    await _get_owned_conversation(db, conversation_id, str(current_user.id))

    request.conversation_id = conversation_id
    service = FinancialAnalystService(db)
    return await service.execute_chat(user_id=str(current_user.id), request=request)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes a conversation thread and its message history."""
    conv = await _get_owned_conversation(db, conversation_id, str(current_user.id))

    await db.delete(conv)
    await db.commit()
    return None
