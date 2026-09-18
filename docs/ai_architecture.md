# AI Architecture — Phase 4: LangGraph Multi-Agent Financial Analyst

> **Note**: The current production implementation is the Phase 4 LangGraph multi-agent graph
> (5-node cyclic graph: planner → analyst → critic → final). See
> [langgraph_architecture.md](langgraph_architecture.md) for the canonical architecture.
> This document describes the evolution from the original Phase 3 single-agent design.

## Overview

The AI Analyst transforms FinPilot AI from a deterministic analytics platform into a conversational AI financial analyst. The architecture is deliberately bounded: the LLM **never** directly queries the database, never performs arithmetic on raw ledger data, and cannot execute financial transactions.

## Core Design Principles

1. **Deterministic Grounding**: All financial facts come from Phase 2 analytics services. The LLM synthesizes and explains, never calculates.
2. **Bounded Tool Calling**: Maximum 5 LangChain tool iterations per request. No infinite loops.
3. **User Isolation**: Tools are factory-created with a server-side `user_id` closure. The LLM never receives or provides `user_id` as an argument.
4. **Educational RAG**: Conceptual knowledge comes from 5 curated, cited CFPB/SEC/FDIC documents. No web browsing.
5. **Safety Guardrails**: Input pre-screening intercepts trade execution, prompt injection, and guaranteed return claims before LLM invocation.
6. **Non-Advisory Boundary**: System prompt, disclaimer, and guardrails enforce that all output is educational and analytical, never regulated financial advice.

## Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT REQUEST                           │
│                POST /api/v1/ai/chat                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│              SafetyGuardrails.inspect_query()               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ BLOCKED: trade execution / guaranteed returns /     │    │
│  │          prompt injection                           │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────┬─────────────────────────────────────────┘
                     │ SAFE
                     ▼
┌──────────────────────────────────────────────────────────────┐
│         ConversationMemoryManager                           │
│  • get_or_create_conversation(user_id, conversation_id)     │
│  • load_conversation_messages() → LangChain message list    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│         FinancialAnalystService — Tool Calling Loop         │
│                                                             │
│  LLM (DeterministicMockFinancialLLM / GPT-4o)             │
│  └─ model.bind_tools(13 financial tools)                   │
│                                                             │
│  while iteration < MAX_TOOL_CALLS (5):                     │
│    response = await model_with_tools.ainvoke(messages)     │
│    if no tool_calls: → final_answer; break                 │
│    for each tool_call:                                      │
│      result = await tool_map[name].ainvoke(args)           │
│      append ToolMessage to messages                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                  13 LangChain Tools                         │
│                                                             │
│  DATA TOOLS (call Phase 2 analytics services):             │
│  • get_financial_overview   • get_cash_flow                │
│  • get_spending_analysis    • get_category_spending        │
│  • search_transactions      • get_budget_status            │
│  • get_goal_status          • get_investment_summary       │
│  • get_net_worth            • get_financial_health         │
│  • get_financial_anomalies  • get_recurring_expenses       │
│                                                             │
│  KNOWLEDGE TOOL:                                           │
│  • query_financial_knowledge_rag → FinancialKnowledgeRetriever│
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│            Phase 2 Analytics Services                       │
│  CashFlowAnalyticsService, SpendingAnalyticsService,       │
│  InvestmentAnalyticsService, NetWorthAnalyticsService,     │
│  BudgetAnalyticsService, GoalAnalyticsService,             │
│  AnomalyDetectionService, FinancialHealthService           │
└─────────────────────────────────────────────────────────────┘
```

## Educational Knowledge Base (RAG)

5 curated markdown documents in `backend/knowledge/`:

| File | Topic | Sources |
|------|-------|---------|
| `emergency_funds.md` | Emergency Fund Fundamentals | CFPB, FDIC |
| `budgeting_fundamentals.md` | Budgeting Methods & 50/30/20 | CFPB |
| `debt_management.md` | Debt Snowball vs. Avalanche | CFPB, FTC |
| `investing_basics_and_diversification.md` | Portfolio Diversification | SEC Investor.gov |
| `financial_health_and_goals.md` | SMART Goals & Net Worth | Federal Reserve |

Retrieval is deterministic keyword + topic overlap scoring, now augmented by vector embeddings and a semantic retriever (Phase 4) with deterministic `MockEmbeddingProvider` for offline/tests and optional OpenAI embeddings.

## Safety Architecture

```
SafetyGuardrails.inspect_query(message):
  1. EXECUTION_INTENT_PATTERNS → "cannot execute trades, brokerage"
  2. GUARANTEED_RETURN_PATTERNS → "investments carry risk, not advisory"
  3. PROMPT_INJECTION_PATTERNS → "instruction override detected"
  Returns: (is_safe: bool, refusal_message: Optional[str])
```

## Conversation Persistence

- `Conversation` model: `id` (UUID), `user_id`, `title`, `created_at`, `updated_at`
- `Message` model: `id` (UUID), `conversation_id`, `role`, `content`, `metadata_json`
- Windowed context loading: last N messages (configurable)
- Per-user isolation: conversation routes enforce `Conversation.user_id == current_user.id`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/ai/health` | AI system health (no auth required) |
| POST | `/api/v1/ai/chat` | Send message, get AI response |
| GET | `/api/v1/ai/conversations` | List user conversations |
| POST | `/api/v1/ai/conversations?title=...` | Create new conversation |
| GET | `/api/v1/ai/conversations/{id}` | Get conversation + messages |
| DELETE | `/api/v1/ai/conversations/{id}` | Delete conversation |

## Model Configuration

`backend/app/ai/config.py` — `AISettings` reads from environment:
- `LLM_PROVIDER`: `openai` (default) or `mock`
- `LLM_MODEL`: GPT model name (default: `gpt-4o-mini`)
- `LLM_API_KEY`: Required for live OpenAI. If unset (or when `LLM_PROVIDER=mock`), falls back to deterministic mock.
- `MAX_TOOL_CALLS_PER_REQUEST`: Maximum tool iterations (default: 5)

## Phase Boundaries

- **Phase 3 (completed)**: LangChain tool calling, conversation memory, keyword RAG, safety guardrails
- **Phase 4 (this phase, implemented)**: LangGraph multi-agent graphs (planner/critic), vector embeddings, advanced RAG
