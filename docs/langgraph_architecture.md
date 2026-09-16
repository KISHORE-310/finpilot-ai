# Phase 4 — LangGraph Multi-Agent Financial Reasoning Architecture

FinPilot AI Phase 4 transforms the single-agent tool invocation pattern into a production-grade multi-agent cyclic graph powered by LangGraph, semantic vector search, and grounded analytical constraints.

---

## 1. Graph Topology

```
                  ┌──────────────────────┐
                  │      User Query      │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Safety Guardrails   │
                  │  (Pre-Graph Filter)  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │     Planner Node     │
                  │ (Intent & Tool Plan) │
                  └──────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       [educational / hybrid]        [financial_data]
  ┌──────────────────────────┐              │
  │   Context Router Node    │              │
  │ (Semantic pgvector RAG)  │              │
  └───────────┬──────────────┘              │
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │     Analyst Node     │ ◄─────────────────┐
                  │ (Tool Execution and  │                   │
                  │   Draft Synthesis)   │                   │
                  └──────────┬───────────┘                   │
                             │                               │
                             ▼                               │
                  ┌──────────────────────┐                   │
                  │     Critic Node      │                   │
                  │ (Grounding & Safety  │                   │
                  │     Evaluation)      │                   │
                  └──────────┬───────────┘                   │
                             │                               │
              ┌──────────────┴──────────────┐                │
              ▼                             ▼                │
         [PASS / Cap]                   [REVISE]             │
  ┌──────────────────────────┐              └────────────────┘
  │   Final Response Node    │           (Bounded Replan Loop,
  │  (Polished ₹ Formatting) │                max 5 turns)
  └───────────┬──────────────┘
              │
              ▼
  ┌──────────────────────────┐
  │       ChatResponse       │
  └──────────────────────────┘
```

---

## 2. Multi-Agent Nodes

| Node | Responsibilities | Output State |
|---|---|---|
| **Planner** | Deconstructs user queries, determines intent (`financial_data`, `educational`, `hybrid`), and identifies minimal necessary deterministic tools. | `intent`, `plan`, `tools_plan` |
| **Context Router** | Activates semantic RAG for conceptual inquiries using cosine similarity search on vector knowledge bases. | `rag_context`, `rag_citations` |
| **Analyst** | Executes planned tools with isolated user scoping, processes ledger responses, and synthesizes grounded draft analysis. | `tools_used`, `tool_outputs`, `analyst_draft`, `key_metrics` |
| **Critic** | Inspects drafts against 5 quality gates: Grounding, Completeness, Accuracy, Non-Advisory Safety, and Clarity. | `critic_verdict` (`PASS` / `REVISE`), `critic_feedback`, `iteration` |
| **Final Response** | Incorporates feedback, formats currency amounts with Indian numbering (₹, lakhs, crores), and attaches grounded citations. | `final_response`, `citations` |

---

## 3. Semantic RAG & Vector Storage

- **Storage**: PostgreSQL with `pgvector` extension (`vector(1536)`), indexed using IVFFlat cosine distance.
- **In-Memory Fallback**: Seamless fallback to in-memory cosine similarity search in test/offline environments (`InMemoryVectorStore`).
- **Embedding Abstraction**: `EmbeddingProvider` interface supporting OpenAI `text-embedding-ada-002` and deterministic `MockEmbeddingProvider` (unit-norm SHA-256 derived vectors).
- **Document Ingestion**: Overlapping chunking (1000 chars, 100 overlap) across verified financial education guides.

---

## 4. Operational Invariants

1. **Deterministic Grounding**: The LLM never writes to the ledger or computes balances directly; all financial metrics are derived from verified service tools.
2. **User Data Isolation**: `user_id` is bound at the session layer and never inferred by the model.
3. **Bounded Replan Loop**: Re-evaluation is strictly capped at `MAX_GRAPH_ITERATIONS = 5` to prevent infinite execution cycles.
4. **India-First Localization**: All monetary values use ₹ / INR formatting and standard Indian financial terms (SIP, PPF, NPS, Demat, UPI).
5. **Observability**: Optional LangSmith tracing integration via `LANGSMITH_TRACING=true`.
