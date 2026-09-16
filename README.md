# FinPilot AI — Agentic Personal Financial Analyst

> **FinPilot AI** is a portfolio-grade personal financial analytics and intelligence platform. It features deterministic financial calculations, multi-period cash flow analytics, budget projections, goal pace monitoring, asset allocation, net worth tracking, statistical anomaly detection, and a rule-based financial health scoring engine.

---

## 🚀 Project Overview & Roadmap

1. **Phase 1: Foundation + Financial Data Platform** ✅
   - Core cash ledger, multi-account management, double-precision monetary math (`Decimal` / `NUMERIC(18,2)`), CSV/Excel data import pipeline with SHA-256 deduplication, JWT authentication, and strict user data isolation.
2. **Phase 2: Financial Intelligence & Analytics Platform** ✅ *(Current)*
   - Dedicated deterministic analytics service layer, executive intelligence dashboard, time-period filtering, granular cash-flow time-series, spending breakdown & top merchants, budget pace projections, goal contribution math, investment allocation, net worth snapshot history, statistical anomaly detection, rule-based financial health scoring, and alert generation.
3. **Phase 3: LangChain AI Analyst + Financial Tool Calling** *(Upcoming)*
   - Expose deterministic analytics APIs as structured LangChain tools with RAG integration.
4. **Phase 4: LangGraph Agentic Financial Analyst** *(Upcoming)*
   - Multi-agent financial reasoning, scenario evaluation, autonomous goal optimization.
5. **Phase 5: Production Evaluation, Hardening & Deployment** *(Upcoming)*

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0 (Async), Alembic, Pydantic v2, aiosqlite / PostgreSQL.
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS.
- **Security**: JWT OAuth2 Bearer Authentication, Password Hashing with Bcrypt, Cross-User Scoped Data Isolation.
- **Precision**: Monetary columns use `Numeric(18, 2)` / `Numeric(18, 4)` and Python `Decimal`. Floating point math is strictly avoided for money.

---

## 📊 Phase 2 Analytics Engine Capabilities

| Component | Methodology / Formula | Endpoints |
|---|---|---|
| **Cash Flow** | $	ext{Net} = 	ext{Income} - 	ext{Expenses}$, $	ext{Savings Rate} = rac{	ext{Net}}{	ext{Income}} 	imes 100$ | `GET /api/v1/analytics/cash-flow` |
| **Spending Breakdown** | Category aggregation, percentage of total spend, MoM trend delta | `GET /api/v1/analytics/spending/categories` |
| **Merchant Analysis** | Top merchants by spend volume, transaction counts, average basket | `GET /api/v1/analytics/spending/merchants` |
| **Budget Projections** | $	ext{Projected} = rac{	ext{Spent}}{	ext{Days Elapsed}} 	imes 	ext{Days in Period}$ (`ON_TRACK`, `WARNING`, `OVER_BUDGET`) | `GET /api/v1/analytics/budgets` |
| **Goal Pace** | $	ext{Req. Monthly} = rac{	ext{Remaining}}{	ext{Months Left}}$, Completion % capped at 100% | `GET /api/v1/analytics/goals` |
| **Investments** | $	ext{P&L} = 	ext{Current Value} - 	ext{Cost Basis}$, Asset allocation breakdown | `GET /api/v1/analytics/investments` |
| **Net Worth** | $	ext{Assets} - 	ext{Liabilities}$, Historical snapshot capture & timeline | `GET /api/v1/analytics/net-worth` |
| **Anomaly Detection** | Outliers flagged at $	ext{Spend} > \mu + 2.5\sigma$ over 90-day baseline | `GET /api/v1/analytics/anomalies` |
| **Health Score** | 0–100 Weighted index across 6 dimensions with transparent rationales | `GET /api/v1/analytics/financial-health` |
| **Rule Alerts** | Deterministic triggers for over-budget, anomalies, upcoming bills | `GET /api/v1/alerts` |

---

## ⚙️ Running Locally

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
pytest -v
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

---

## ⚠️ Financial Disclaimer
FinPilot AI provides educational personal finance organization and deterministic analytical tools. It does not provide certified financial, investment, legal, tax, or credit advice. Investment holdings reflect user-entered recorded valuations.

## Phase 3: AI Financial Analyst (LangChain) ✅

Phase 3 introduces the conversational AI layer on top of the Phase 2 analytics platform.

### What's New in Phase 3

- **LangChain Tool Calling**: 13 user-scoped deterministic tools wrapping Phase 2 analytics services
- **Conversation Memory**: Persistent multi-turn conversation threads with SQLAlchemy storage
- **Educational RAG**: Curated knowledge base (CFPB, SEC, FDIC, Federal Reserve) with citations
- **Safety Guardrails**: Trade execution refusal, prompt injection detection, guaranteed-returns interception
- **AI Analyst UI**: Complete React workspace with conversation sidebar, tool usage badges, and citation cards
- **Anti-Hallucination**: LLM synthesizes grounded analytics output, never performs raw arithmetic

### AI Endpoint

```bash
# Chat with your financial data
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my net worth and savings rate this month?"}'
```

### Phase 3 Test Suite

```bash
cd backend
pytest tests/test_ai_*.py -v
# Expected: 20 Phase 3 tests + 17 Phase 1&2 tests = 37 total passing
```

