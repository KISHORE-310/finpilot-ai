# FinPilot AI — REST API Reference

**Base URL**: /api/v1  
**Authentication**: Bearer JWT (Authorization: Bearer <token>) unless noted as Public.

---

## 1. Authentication & Session (/auth)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /auth/register | Public | Register a new user account with email, password (min 8 chars, mixed case + digits), and name. |
| POST | /auth/login | Public | Authenticate via OAuth2 form or JSON credentials. Returns ccess_token and user profile. |
| POST | /auth/logout | Authenticated | Revokes current JWT token by adding its jti to the server blacklist. |
| GET | /auth/me | Authenticated | Returns current authenticated user profile and subscription tier. |

---

## 2. Accounts & Ledger (/accounts)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /accounts | Authenticated | List all accounts (checking, savings, credit, investment, loan) for current user. |
| POST | /accounts | Authenticated | Create a new financial account with initial balance and currency. |
| GET | /accounts/{id} | Authenticated | Get specific account details and current balance. |
| PUT | /accounts/{id} | Authenticated | Update account metadata (name, type, institution). |
| DELETE | /accounts/{id} | Authenticated | Delete account (cascades or prevents if active transactions exist). |

---

## 3. Double-Entry Transactions (/transactions)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /transactions | Authenticated | Paginated transaction filtering by date range, account, category, search term, and type. |
| POST | /transactions | Authenticated | Create transaction (income, expense, or double-entry transfer with 	ransfer_account_id). |
| GET | /transactions/{id} | Authenticated | Get transaction detail by ID. |
| PUT | /transactions/{id} | Authenticated | Update transaction amount, category, merchant, or notes. Updates account balances. |
| DELETE | /transactions/{id} | Authenticated | Delete transaction and reverse its balance effects on affected accounts. |

---

## 4. Bank Statement & CSV Imports (/imports)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /imports/upload | Authenticated | Upload CSV / statement file (max 10MB) for server-side validation and parsing. |
| POST | /imports/preview | Authenticated | Parse uploaded data into structured preview rows with category suggestions and duplicate detection. |
| POST | /imports/execute | Authenticated | Commit approved imported rows to the transaction ledger with deduplication hashes. |

---

## 5. Budgets & Goal Milestones (/budgets, /goals)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /budgets | Authenticated | List active budgets with period allocations and spend limits. |
| POST | /budgets | Authenticated | Create a category budget limit with period rollover rules. |
| GET | /goals | Authenticated | List financial savings targets with target amounts and completion deadlines. |
| POST | /goals | Authenticated | Create a goal with target date and auto-contribution tracking. |

---

## 6. Investments & Portfolio (/investments)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /investments | Authenticated | List portfolio holdings (stocks, mutual funds, ETFs, crypto) with cost basis and current values. |
| POST | /investments | Authenticated | Record an investment holding or trade lot. |
| POST | /investments/transactions | Authenticated | Record buy/sell transactions and compute realized gains/losses. |

---

## 7. Deterministic Financial Analytics (/analytics)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /analytics/overview | Authenticated | Consolidated executive financial dashboard (net worth, cash flow, budgets, health score). |
| GET | /analytics/cash-flow | Authenticated | Time-series income vs. expenses, net cash flow, and savings rate percentage. |
| GET | /analytics/spending/categories | Authenticated | Categorical spend breakdown with period-over-period percentage delta. |
| GET | /analytics/spending/merchants | Authenticated | Top merchants ranked by spend volume and frequency. |
| GET | /analytics/spending/largest | Authenticated | Outlier and largest single expenditures in selected period. |
| GET | /analytics/spending/recurring | Authenticated | Annualized recurring commitments and subscriptions. |
| GET | /analytics/budgets | Authenticated | Budget utilization rates and deterministic end-of-period pace projections. |
| GET | /analytics/goals | Authenticated | Goal progress completion rates and required monthly contributions. |
| GET | /analytics/income | Authenticated | Income stream classification, recurring ratio, and Stability Index (0–100). |
| GET | /analytics/investments | Authenticated | Asset allocation, cost basis vs. market value, and total portfolio return. |
| GET | /analytics/net-worth | Authenticated | Balance sheet breakdown (assets vs. liabilities) and snapshot history. |
| POST | /analytics/net-worth/snapshot | Authenticated | Persist daily net worth snapshot point. |
| GET | /analytics/anomalies | Authenticated | Statistical expense anomalies (> 2.5 standard deviations from 90-day baseline). |
| GET | /analytics/financial-health | Authenticated | 0–100 Financial Health Index across 6 weighted dimensions with actionable insights. |

---

## 8. Rule-Based Financial Alerts (/alerts)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /alerts | Authenticated | List active notifications, spending warnings, and bill reminders. |
| GET | /alerts/summary | Authenticated | Return counts of unread and critical priority alerts. |
| PATCH | /alerts/{id}/read | Authenticated | Mark alert notification as read. |
| POST | /alerts/evaluate | Authenticated | Re-evaluate all deterministic alert rules for the current user. |

---

## 9. AI Multi-Agent Analyst & Semantic RAG (/ai)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /ai/health | Public | Safe AI subsystem health probe (returns model, provider, active tools count, and knowledge doc count without leaking keys). |
| POST | /ai/chat | Authenticated | Natural language query processing via LangGraph multi-agent pipeline with deterministic tool execution and verified citations. |
| GET | /ai/conversations | Authenticated | List recent conversation threads with message counts and timestamps. |
| POST | /ai/conversations | Authenticated | Create a new conversation thread. |
| GET | /ai/conversations/{id} | Authenticated | Retrieve conversation thread with full message history. |
| POST | /ai/conversations/{id}/messages | Authenticated | Send message within an existing conversation thread. |
| DELETE | /ai/conversations/{id} | Authenticated | Delete conversation thread and associated messages. |

---

## 10. Financial Calculators (/calculators)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /calculators/tax | Public/Auth | Indian Old vs. New Tax Regime comparison (FY 2024-25 / AY 2025-26) with rebate and 80C/80D breakdown. |
| POST | /calculators/fire | Public/Auth | Financial Independence / Retire Early (FIRE) number, savings timeline, and safe withdrawal rate. |
| POST | /calculators/loan-prepayment | Public/Auth | Prepayment savings calculator (EMI reduction vs. tenure reduction and total interest saved). |

---

## 11. System Health & Probes (Root)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /health | Public | Liveness probe verifying application process is responsive. |
| GET | /ready | Public | Readiness probe executing active database connectivity check (SELECT 1). Returns 503 if database is disconnected. |