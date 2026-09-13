# FinPilot AI — REST API Documentation (Phase 2)

Base URL: `/api/v1`

All authenticated endpoints require the `Authorization: Bearer <jwt_token>` header.

---

## 1. Financial Analytics Endpoints (`/analytics`)

### `GET /analytics/overview`
Returns consolidated executive dashboard data for the selected period.
- **Query params**: `period` (`this_month`, `last_month`, `last_3_months`, `last_6_months`, `this_year`, `last_year`, `custom`), `start_date`, `end_date`.
- **Response**: `AnalyticsOverviewResponse` (Net worth, cash flow, spending breakdown, budgets, goals, investments, health score, top alerts).

### `GET /analytics/cash-flow`
Returns time-series cash flow data.
- **Query params**: `period`, `granularity` (`daily`, `weekly`, `monthly`), `start_date`, `end_date`.
- **Response**: `CashFlowResponse` (Total income, total expenses, net cash flow, savings rate %, historical avg, points array).

### `GET /analytics/spending/categories`
Returns category expenditure breakdown with period-over-period comparison.
- **Response**: `SpendingBreakdownResponse` (Total spend, previous spend, change %, categories array with percentages and transaction counts).

### `GET /analytics/spending/merchants`
Returns top merchants ranked by spend volume.
- **Query params**: `period`, `limit` (default 10).
- **Response**: `MerchantSpendingResponse` (Total tracked spend, merchants array with count and average transaction).

### `GET /analytics/spending/largest`
Returns the largest individual expense transactions in the period.
- **Query params**: `period`, `limit` (default 10).

### `GET /analytics/spending/recurring`
Returns active recurring commitments with normalized monthly and annualized figures.
- **Response**: `RecurringAnalysisResponse` (Monthly total, annual total, active items, upcoming 30 days).

### `GET /analytics/budgets`
Returns active budgets with utilization and deterministic pace projections.
- **Response**: `BudgetAnalyticsResponse` (Allocated, actual spent, remaining, % used, projected spend, status `ON_TRACK` / `WARNING` / `OVER_BUDGET`).

### `GET /analytics/goals`
Returns financial goals with deadline pace metrics.
- **Response**: `GoalAnalyticsResponse` (Target, current, remaining, completion %, required monthly contribution, status `ON_TRACK` / `AT_RISK` / `BEHIND` / `COMPLETED`).

### `GET /analytics/income`
Returns income streams and deterministic stability index.
- **Response**: `IncomeAnalyticsResponse` (Total, recurring share, stability index 0-100, sources breakdown).

### `GET /analytics/investments`
Returns portfolio summary, total P&L, return %, and asset allocation.
- **Response**: `InvestmentAnalyticsResponse` (Total cost basis, current value, total P&L, P&L %, allocation breakdown).

### `GET /analytics/net-worth`
Returns current balance sheet and historical snapshots timeline.
- **Response**: `NetWorthAnalyticsResponse` (Current assets/liabilities breakdown, snapshot history).

### `POST /analytics/net-worth/snapshot`
Captures today's net worth snapshot.
- **Response**: `NetWorthSnapshotPoint` (snapshot date, assets, liabilities, net worth).

### `GET /analytics/anomalies`
Returns statistically unusual transactions ($> \mu + 2.5\sigma$).
- **Response**: `AnomalyResponse` (Anomalies list with typical amounts and deviation factors).

### `GET /analytics/financial-health`
Returns the 0–100 Financial Health Index with dimension sub-scores and transparent explanations.
- **Response**: `FinancialHealthResponse` (Overall score, rating, 6 dimension scores, strengths, areas to improve).

---

## 2. Financial Alerts Endpoints (`/alerts`)

### `GET /alerts`
List user alerts. Supports `unread_only=true` and `limit`.

### `GET /alerts/summary`
Returns unread and critical count summary.

### `PATCH /alerts/{id}/read`
Marks a specific alert as read.

### `POST /alerts/evaluate`
Triggers deterministic evaluation of all alert rules (budgets, anomalies, upcoming bills).
