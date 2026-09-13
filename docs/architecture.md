# FinPilot AI — Architecture Documentation (Phases 1 & 2)

## 1. Core Architectural Pipeline
FinPilot AI uses a multi-tiered, deterministic architecture designed for accuracy, isolation, and future AI agent tool calling:

```text
Database (PostgreSQL / SQLite in Tests)
       ↓
SQLAlchemy ORM + Repository Layer
       ↓
Modular Financial Analytics Engine (Python Decimal)
       ↓
Strict Pydantic Response Schemas (Pydantic v2)
       ↓
REST API Endpoints (/api/v1/analytics/*, /api/v1/alerts/*)
       ↓
Frontend Intelligence Dashboard & Deep-Dive Analytics (Next.js 15)
```

---

## 2. Data Model & Precision
All financial amounts are stored as exact numeric representations (`NUMERIC(18, 2)` or `NUMERIC(18, 4)`) and mapped to Python `Decimal` instances. Floating point arithmetic is strictly avoided for all monetary operations.

### Entities
1. **User**: Authentication, encrypted credentials (`bcrypt`), active status.
2. **Account**: Liquid assets, liabilities, credit cards, loans, investment accounts.
3. **Transaction**: Cash ledger entries with `amount`, `transaction_date`, `merchant_name`, `import_hash`.
4. **Category**: System default and user-defined categories.
5. **Income & Expense**: Granular income sources and scheduled expense streams.
6. **Investment & InvestmentTransaction**: Holdings (stocks, ETFs, mutual funds, bonds, crypto) with cost basis and recorded current value.
7. **FinancialGoal**: Milestone targets with deadline pace calculation.
8. **Budget**: Spending limits with deterministic end-of-period pace projection.
9. **RecurringTransaction**: Automated scheduled transactions with frequency calculations.
10. **NetWorthSnapshot** *(Phase 2)*: Time-series snapshots of total assets, liabilities, and net worth.
11. **FinancialAlert** *(Phase 2)*: Deterministic rule-based notifications and anomaly alerts.

---

## 3. Financial Analytics Engine Modules (`apps/api/app/services/analytics/`)
- `date_range_helper.py`: Normalizes dynamic periods (`this_month`, `last_month`, `last_3_months`, `last_6_months`, `this_year`, `last_year`, `custom`) and calculates previous comparison periods.
- `cash_flow_service.py`: Computes net cash flow, savings rate, and granular time-series (daily/weekly/monthly).
- `spending_service.py`: Categorical breakdown, period-over-period delta %, top merchant aggregations, and annualized recurring commitments.
- `income_service.py`: Stream classification, recurring ratio, and deterministic Income Stability Index (0–100).
- `budget_analytics_service.py`: Utilization % and deterministic pace projection ($rac{	ext{spent}}{	ext{days\_elapsed}} 	imes 	ext{days\_in\_period}$).
- `goal_analytics_service.py`: Completion % and required monthly contribution math.
- `investment_analytics_service.py`: Cost basis, current value, total P&L, return %, and asset class allocation.
- `net_worth_service.py`: Asset vs liability categorization, net worth calculation, and snapshot history.
- `anomaly_service.py`: 90-day baseline mean and standard deviation ($\mu + 2.5\sigma$) outlier detection.
- `financial_health_service.py`: 0–100 Weighted composite index across 6 dimensions with transparent explanations.
- `alert_service.py`: Rule evaluation engine for budget warnings, spikes, and bills.
- `insights_service.py`: Structured analytical insights for Phase 3 LangChain tool ingestion.

---

## 4. Multi-Tenant User Isolation & Security
Every query, aggregate, alert, and snapshot is strictly scoped by the authenticated `user_id`. Attempting to access another user's resources returns `404 Not Found` with zero information leakage.
