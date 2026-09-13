# FinPilot AI — Financial Calculation & Scoring Methodology

This document outlines the exact deterministic mathematical formulas, thresholds, and methodologies used throughout FinPilot AI Phase 2.

---

## 1. Cash Flow & Savings Rate
- **Net Cash Flow**:
  $$\text{Net Cash Flow} = \sum \text{Income} - \sum \text{Expenses}$$
- **Savings Rate**:
  $$\text{Savings Rate} = \begin{cases} \left(\frac{\text{Net Cash Flow}}{\text{Total Income}}\right) \times 100, & \text{if Total Income} > 0 \\ 0.00, & \text{otherwise} \end{cases}$$
- **Historical Average Savings Rate**: Mean savings rate calculated across all monthly points with recorded income $> 0$.

---

## 2. Spending Analysis & Period-over-Period Deltas
- **Category Percentage**:
  $$\text{Category \%} = \left(\frac{\text{Category Spend}}{\text{Total Period Expenses}}\right) \times 100$$
- **Period-over-Period Change %**:
  $$\text{Change \%} = \begin{cases} \left(\frac{\text{Current Spend} - \text{Previous Spend}}{\text{Previous Spend}}\right) \times 100, & \text{if Previous Spend} > 0 \\ 0.00, & \text{otherwise} \end{cases}$$
- **Recurring Annualized Cost**:
  - Daily: $\text{Amount} \times 365$
  - Weekly: $\text{Amount} \times 52$
  - Biweekly: $\text{Amount} \times 26$
  - Monthly: $\text{Amount} \times 12$
  - Quarterly: $\text{Amount} \times 4$
  - Yearly: $\text{Amount} \times 1$

---

## 3. Budget Projection & Status Classification
- **Projected End-of-Period Spend**:
  $$\text{Projected Spend} = \left(\frac{\text{Actual Spent}}{\max(1, \text{Days Elapsed})}\right) \times \text{Total Days in Period}$$
- **Status Classification Rules**:
  - `OVER_BUDGET`: $\text{Actual Spent} \ge \text{Budget Amount}$ ($100\%$ used).
  - `WARNING`: $80\% \le \text{Utilization} < 100\%$ OR ($\text{Projected Spend} > \text{Budget}$ and $\text{Days Elapsed} > 5$).
  - `ON_TRACK`: $\text{Utilization} < 80\%$ and $\text{Projected Spend} \le \text{Budget}$.

---

## 4. Financial Goal Pace & Required Contributions
- **Completion Percentage**:
  $$\text{Completion \%} = \min\left(100.00, \left(\frac{\text{Current Amount}}{\text{Target Amount}}\right) \times 100\right)$$
- **Required Monthly Contribution**:
  $$\text{Required Monthly} = \begin{cases} \frac{\text{Target Amount} - \text{Current Amount}}{\max(1, \text{Months Remaining})}, & \text{if Current} < \text{Target and Target Date is future} \\ 0.00, & \text{otherwise} \end{cases}$$
- **Status Classification**:
  - `COMPLETED`: $\text{Current} \ge \text{Target}$.
  - `BEHIND`: Target date passed with remaining balance, or progress $< 25\%$ with imminent target date.
  - `AT_RISK`: $25\% \le \text{Progress} < 50\%$ with less than 3 months remaining.
  - `ON_TRACK`: Progress $\ge 50\%$ or $\ge 3$ months remaining with steady progress.

---

## 5. Investment Portfolio Analytics
- **Total Invested (Cost Basis)**: $\sum (\text{Quantity} \times \text{Average Cost})$
- **Current Value**: $\sum \text{Current Recorded Value}$
- **Total P&L**: $\text{Current Value} - \text{Total Invested}$
- **P&L Percentage**: $(\frac{\text{Total P\&L}}{\text{Total Invested}}) \times 100$ if $\text{Invested} > 0$ else $0.00$.

---

## 6. Net Worth & Balance Sheet
- **Assets**: Cash, Checking, Savings, Bank Accounts, Investment Accounts, Recorded Holdings, Asset Accounts.
- **Liabilities**: Credit Card Balances, Loan Accounts, Negative Other Accounts.
- **Net Worth**: $\text{Total Assets} - \text{Total Liabilities}$.

---

## 7. Deterministic Anomaly Detection
- Analyzes all expense transactions over a 90-day baseline window.
- Computes mean ($\mu$) and standard deviation ($\sigma$).
- Anomaly Flag: Any transaction within the selected period where:
  $$\text{Amount} > \max(100.00, \mu + 2.5\sigma)$$
- Severity: `CRITICAL` if $\text{Amount} > 1.5 \times \text{Threshold}$, else `WARNING`.

---

## 8. Financial Health Score (0–100 Weighted Model)
Computed deterministically across 6 core pillars:
1. **Savings & Cash Flow** (25% weight): Based on 90-day savings rate ($\ge 30\% 	o 100$, $20-30\% 	o 85$, $10-20\% 	o 70$, $0-10\% 	o 50$, $< 0\% 	o 25$).
2. **Budget Adherence** (20% weight): Ratio of active budgets on-track vs warning/over-budget.
3. **Emergency Liquidity** (15% weight): Ratio of liquid cash to 3-month average monthly expenses ($\ge 6\text{mo} 	o 100$, $3-6\text{mo} 	o 80$, $1-3\text{mo} 	o 60$, $< 1\text{mo} 	o 30$).
4. **Debt Burden** (15% weight): Liabilities / Assets ratio ($0\% \to 100$, $< 20\% \to 85$, $20-50\% \to 65$, $> 50\% \to 35$).
5. **Goal Progress** (15% weight): Weighted completion percentage of all active financial goals.
6. **Investments & Growth** (10% weight): Presence and positive return performance of investment holdings.

Overall Score $= \sum (\text{Dimension Score} \times \text{Weight})$.
- $\ge 85$: **Excellent**
- $70 - 84$: **Strong**
- $50 - 69$: **Moderate**
- $< 50$: **Needs Attention**
