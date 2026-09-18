// ==========================================
// FinPilot AI - TypeScript Type Definitions
// ==========================================

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Accounts
// ──────────────────────────────────────────────
export type AccountType =
  | "bank"
  | "checking"
  | "savings"
  | "cash"
  | "credit_card"
  | "loan"
  | "investment"
  | "other";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  institution: string | null;
  currency: string;
  current_balance: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSummary {
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
  currency: string;
  account_count: number;
}

// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────
export type CategoryType = "income" | "expense" | "transfer";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  category_type: CategoryType;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Transactions
// ──────────────────────────────────────────────
export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: string;
  currency: string;
  transaction_type: TransactionType;
  transaction_date: string;
  description: string;
  merchant_name: string | null;
  notes: string | null;
  is_cleared: boolean;
  import_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

// ──────────────────────────────────────────────
// Income
// ──────────────────────────────────────────────
export type IncomeSource =
  | "salary"
  | "business"
  | "freelance"
  | "investments"
  | "rental"
  | "other";

export interface Income {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  source: IncomeSource;
  amount: string;
  currency: string;
  is_recurring: boolean;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────────
export interface Expense {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  name: string;
  amount: string;
  currency: string;
  is_recurring: boolean;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Investments
// ──────────────────────────────────────────────
export type AssetType =
  | "stock"
  | "etf"
  | "crypto"
  | "mutual_fund"
  | "bond"
  | "real_estate"
  | "cash"
  | "other";

export interface Investment {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  asset_type: AssetType;
  symbol: string | null;
  quantity: string;
  average_cost: string;
  current_value: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type InvestmentTxType = "buy" | "sell" | "dividend" | "split";

export interface InvestmentTransaction {
  id: string;
  investment_id: string;
  user_id: string;
  transaction_type: InvestmentTxType;
  quantity: string;
  price_per_unit: string;
  total_value: string;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Goals
// ──────────────────────────────────────────────
export type GoalType =
  | "emergency_fund"
  | "retirement"
  | "purchase"
  | "vacation"
  | "education"
  | "wedding"
  | "debt_payoff"
  | "investment"
  | "savings"
  | "other";

export type GoalStatus = "active" | "achieved" | "paused" | "cancelled" | "in_progress" | "completed";

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  currency: string;
  status: GoalStatus;
  is_active: boolean;
  notes: string | null;
  progress_percentage?: number;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Budgets
// ──────────────────────────────────────────────
export type BudgetPeriod = "weekly" | "monthly" | "quarterly" | "annual";

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  amount: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string | null;
  currency: string;
  spent_amount: string | null;
  remaining_amount: string | null;
  percentage_used: number | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Recurring Transactions
// ──────────────────────────────────────────────
export type Frequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  name: string;
  amount: string;
  transaction_type: TransactionType;
  frequency: Frequency;
  next_occurrence: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// Phase 2: Analytics & Intelligence Types
// ──────────────────────────────────────────────
export type PeriodOption =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year"
  | "custom";

export interface CashFlowPoint {
  date: string;
  income: string;
  expenses: string;
  net: string;
  savings_rate: string;
}

export interface CashFlowResponse {
  start_date: string;
  end_date: string;
  granularity: string;
  total_income: string;
  total_expenses: string;
  net_cash_flow: string;
  savings_rate: string;
  historical_avg_savings_rate: string;
  best_month: string | null;
  worst_month: string | null;
  points: CashFlowPoint[];
}

export interface CategorySpendItem {
  category_id: string | null;
  category_name: string;
  amount: string;
  percentage: string;
  prev_amount: string;
  absolute_change: string;
  percentage_change: string;
  transaction_count: number;
}

export interface SpendingBreakdownResponse {
  start_date: string;
  end_date: string;
  total_spending: string;
  prev_total_spending: string;
  total_change_percent: string;
  average_daily_spend: string;
  average_monthly_spend: string;
  categories: CategorySpendItem[];
}

export interface MerchantSpendItem {
  merchant_name: string;
  total_spent: string;
  transaction_count: number;
  average_transaction: string;
}

export interface MerchantSpendingResponse {
  total_tracked_spend: string;
  merchants: MerchantSpendItem[];
}

export interface LargestTransactionItem {
  id: string;
  merchant_name: string | null;
  description: string;
  amount: string;
  transaction_date: string;
  category_name: string;
  account_name: string;
}

export interface LargestTransactionsResponse {
  transactions: LargestTransactionItem[];
}

export interface RecurringExpenseItem {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  annualized_amount: string;
  monthly_equivalent: string;
  next_occurrence: string;
  account_name: string;
}

export interface RecurringAnalysisResponse {
  monthly_total: string;
  annual_total: string;
  active_count: number;
  items: RecurringExpenseItem[];
  upcoming_30_days: RecurringExpenseItem[];
}

export interface BudgetAnalyticsItem {
  id: string;
  name: string;
  category_name: string;
  allocated_amount: string;
  actual_spent: string;
  remaining_amount: string;
  percentage_used: string;
  days_in_period: number;
  days_elapsed: number;
  days_remaining: number;
  projected_spend: string;
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET";
}

export interface BudgetAnalyticsResponse {
  total_budget: string;
  total_spent: string;
  total_remaining: string;
  overall_utilization: string;
  on_track_count: number;
  warning_count: number;
  over_budget_count: number;
  budgets: BudgetAnalyticsItem[];
}

export interface GoalAnalyticsItem {
  id: string;
  name: string;
  target_amount: string;
  current_amount: string;
  remaining_amount: string;
  completion_percentage: string;
  target_date: string | null;
  months_remaining: number | null;
  required_monthly_contribution: string;
  current_monthly_pace: string;
  contribution_gap: string;
  status: "ON_TRACK" | "AT_RISK" | "BEHIND" | "COMPLETED";
}

export interface GoalAnalyticsResponse {
  total_target: string;
  total_saved: string;
  overall_progress: string;
  completed_count: number;
  in_progress_count: number;
  goals: GoalAnalyticsItem[];
}

export interface IncomeSourceItem {
  source: string;
  amount: string;
  percentage: string;
  is_recurring: boolean;
}

export interface IncomeAnalyticsResponse {
  total_income: string;
  recurring_income: string;
  non_recurring_income: string;
  recurring_percentage: string;
  stability_index: string;
  stability_rating: string;
  sources: IncomeSourceItem[];
}

export interface AssetAllocationItem {
  asset_type: string;
  current_value: string;
  percentage: string;
}

export interface InvestmentAnalyticsResponse {
  total_invested: string;
  current_value: string;
  total_pnl: string;
  pnl_percentage: string;
  positions_count: number;
  allocations: AssetAllocationItem[];
  disclaimer: string;
}

export interface AssetLiabilityBreakdown {
  cash: string;
  bank_accounts: string;
  investments: string;
  other_assets: string;
  total_assets: string;
  credit_cards: string;
  loans: string;
  other_liabilities: string;
  total_liabilities: string;
  net_worth: string;
}

export interface NetWorthSnapshotPoint {
  snapshot_date: string;
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
}

export interface NetWorthAnalyticsResponse {
  current: AssetLiabilityBreakdown;
  history: NetWorthSnapshotPoint[];
  mom_change: string;
  mom_change_percent: string;
}

export interface AnomalyItem {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  amount: string;
  typical_amount: string;
  deviation_factor: string;
  date: string;
  category_name: string | null;
  merchant_name: string | null;
}

export interface AnomalyResponse {
  total_anomalies: number;
  anomalies: AnomalyItem[];
}

export interface HealthScoreDimension {
  name: string;
  score: number;
  weight: string;
  status: string;
  description: string;
}

export interface FinancialHealthResponse {
  overall_score: number;
  rating: string;
  dimensions: HealthScoreDimension[];
  strengths: string[];
  areas_to_improve: string[];
  methodology_note: string;
}

export interface FinancialInsightItem {
  metric: string;
  title: string;
  description: string;
  severity: string;
  value: string;
}

export interface InsightsResponse {
  insights: FinancialInsightItem[];
}

export interface AlertResponse {
  id: string;
  user_id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  is_read: boolean;
  context_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertSummary {
  total_count: number;
  unread_count: number;
  critical_count: number;
}

export interface AnalyticsOverviewResponse {
  period: string;
  start_date: string;
  end_date: string;
  net_worth: AssetLiabilityBreakdown;
  cash_flow: CashFlowResponse;
  spending: SpendingBreakdownResponse;
  budget_summary: BudgetAnalyticsResponse;
  goal_summary: GoalAnalyticsResponse;
  investment_summary: InvestmentAnalyticsResponse;
  financial_health: FinancialHealthResponse;
  top_alerts: AlertResponse[];
}

// ──────────────────────────────────────────────
// Imports
// ──────────────────────────────────────────────
export interface ImportPreviewRecord {
  date: string;
  amount: string;
  description: string;
  transaction_type: string | null;
  is_duplicate: boolean;
}

export interface ImportPreviewResponse {
  filename: string;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  column_mapping: Record<string, string>;
  preview: ImportPreviewRecord[];
}

export interface ImportExecuteResponse {
  imported_count: number;
  skipped_duplicates: number;
  error_count: number;
  errors: Array<{ row: number; error: string }>;
}

// ──────────────────────────────────────────────
// Common
// ──────────────────────────────────────────────
export interface MessageResponse {
  message: string;
}


// ==========================================
// PHASE 3 — AI FINANCIAL ANALYST TYPES
// ==========================================

export interface Citation {
  topic: string;
  title: string;
  source: string;
  source_url?: string;
  snippet?: string;
}

export interface KeyMetric {
  label: string;
  value: string;
  change?: string;
}

export interface AIInsight {
  title: string;
  description: string;
  severity?: "info" | "warning" | "critical";
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  include_rag?: boolean;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  response: string;
  answer?: string;
  key_metrics: KeyMetric[];
  insights: AIInsight[];
  citations: Citation[];
  tools_used: string[];
  guardrail_intervened?: boolean;
  disclaimer?: string;
}

export interface ConversationResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: MessageItemResponse[];
}

export interface MessageItemResponse {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tools_used?: string[];
  citations?: Citation[];
  created_at: string;
}

export interface AIHealthResponse {
  enabled: boolean;
  provider: string;
  model: string;
  tools_count: number;
  knowledge_docs_count: number;
  rag_documents_count: number;
  rate_limit_per_minute: number;
}

// ──────────────────────────────────────────────
// Calculators & Financial Simulators
// ──────────────────────────────────────────────
export interface TaxRegimeBreakdown {
  gross_income: string | number;
  total_deductions_exemptions: string | number;
  standard_deduction: string | number;
  taxable_income: string | number;
  slab_tax: string | number;
  rebate_87a: string | number;
  tax_after_rebate: string | number;
  health_education_cess_4pct: string | number;
  total_tax_liability: string | number;
  effective_tax_rate_pct: string | number;
  monthly_take_home_pay: string | number;
}

export interface TaxCalculatorRequest {
  financial_year?: string;
  gross_annual_income: number;
  basic_salary?: number;
  hra_received?: number;
  rent_paid_annual?: number;
  is_metro_city?: boolean;
  section_80c?: number;
  section_80d?: number;
  section_80ccd_1b?: number;
  home_loan_interest_24b?: number;
  other_exemptions?: number;
}

export interface TaxCalculatorResponse {
  financial_year: string;
  recommended_regime: "NEW" | "OLD";
  tax_savings_with_recommended: string | number;
  new_regime: TaxRegimeBreakdown;
  old_regime: TaxRegimeBreakdown;
  summary_insight: string;
}

export interface YearlyGrowthRow {
  year_index: number;
  age: number;
  annual_investment: string | number;
  portfolio_value: string | number;
  annual_expenses_inflated: string | number;
  is_fire_achieved: boolean;
}

export interface FIRECalculatorRequest {
  current_age: number;
  target_retirement_age: number;
  life_expectancy_age?: number;
  current_annual_expenses: number;
  current_invested_net_worth: number;
  monthly_sip_contribution: number;
  annual_sip_step_up_pct: number;
  expected_inflation_pct: number;
  pre_retirement_return_pct: number;
  post_retirement_return_pct?: number;
  safe_withdrawal_rate_pct: number;
}

export interface FIRECalculatorResponse {
  years_to_target_age: number;
  future_annual_expense_at_fire: string | number;
  standard_fire_target_corpus: string | number;
  lean_fire_target_corpus: string | number;
  fat_fire_target_corpus: string | number;
  coast_fire_target_corpus: string | number;
  projected_corpus_at_target_age: string | number;
  is_on_track_at_target_age: boolean;
  corpus_shortfall_or_surplus: string | number;
  recommended_monthly_sip: string | number;
  estimated_fire_age: number | null;
  trajectory_sample: YearlyGrowthRow[];
  summary_insight: string;
}

export interface LoanPrepaymentRequest {
  loan_principal: number;
  annual_interest_rate_pct: number;
  loan_tenure_years: number;
  extra_monthly_payment: number;
  annual_lump_sum_prepayment: number;
}

export interface LoanPrepaymentResponse {
  standard_monthly_emi: string | number;
  standard_total_interest: string | number;
  standard_total_payment: string | number;
  standard_tenure_months: number;
  with_prepayment_total_interest: string | number;
  with_prepayment_total_payment: string | number;
  with_prepayment_tenure_months: number;
  total_interest_saved: string | number;
  tenure_reduction_months: number;
  tenure_reduction_years: string | number;
  summary_insight: string;
}

