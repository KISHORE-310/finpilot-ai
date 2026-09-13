import {
  Account,
  AlertResponse,
  AlertSummary,
  AnalyticsOverviewResponse,
  AnomalyResponse,
  Budget,
  BudgetAnalyticsResponse,
  CashFlowResponse,
  Category,
  Expense,
  FinancialHealthResponse,
  Goal,
  GoalAnalyticsResponse,
  ImportExecuteResponse,
  ImportPreviewResponse,
  Income,
  IncomeAnalyticsResponse,
  InsightsResponse,
  Investment,
  InvestmentAnalyticsResponse,
  InvestmentTransaction,
  LargestTransactionsResponse,
  MerchantSpendingResponse,
  NetWorthAnalyticsResponse,
  NetWorthSnapshotPoint,
  PaginatedTransactions,
  RecurringAnalysisResponse,
  RecurringTransaction,
  SpendingBreakdownResponse,
  Transaction,
  User,
  ChatRequest,
  ChatResponse,
  ConversationResponse,
  MessageItemResponse,
  AIHealthResponse,
} from '@/types';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('finpilot_token') || localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const path = cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `/api/v1${cleanEndpoint}`;
    const url = `${BASE_URL}${path}`;

    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {}),
    };

    if (options.body instanceof FormData) {
      delete (headers as Record<string, string>)['Content-Type'];
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('finpilot_token');
        localStorage.removeItem('token');
        localStorage.removeItem('finpilot_user');
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'An unexpected error occurred' }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ──────────────────────────────────────────────
  // Phase 2 Analytics Helper Methods
  // ──────────────────────────────────────────────
  analytics = {
    getOverview: (period = 'this_month', startDate?: string, endDate?: string) => {
      let q = `/analytics/overview?period=${period}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<AnalyticsOverviewResponse>(q);
    },
    getCashFlow: (period = 'this_month', granularity = 'monthly', startDate?: string, endDate?: string) => {
      let q = `/analytics/cash-flow?period=${period}&granularity=${granularity}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<CashFlowResponse>(q);
    },
    getSpending: (period = 'this_month', startDate?: string, endDate?: string) => {
      let q = `/analytics/spending?period=${period}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<SpendingBreakdownResponse>(q);
    },
    getSpendingCategories: (period = 'this_month', startDate?: string, endDate?: string) => {
      let q = `/analytics/spending/categories?period=${period}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<SpendingBreakdownResponse>(q);
    },
    getTopMerchants: (period = 'this_month', limit = 10, startDate?: string, endDate?: string) => {
      let q = `/analytics/spending/merchants?period=${period}&limit=${limit}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<MerchantSpendingResponse>(q);
    },
    getLargestTransactions: (period = 'this_month', limit = 10, startDate?: string, endDate?: string) => {
      let q = `/analytics/spending/largest?period=${period}&limit=${limit}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<LargestTransactionsResponse>(q);
    },
    getRecurringAnalysis: () => this.get<RecurringAnalysisResponse>('/analytics/spending/recurring'),
    getBudgets: () => this.get<BudgetAnalyticsResponse>('/analytics/budgets'),
    getGoals: () => this.get<GoalAnalyticsResponse>('/analytics/goals'),
    getIncome: (period = 'this_month', startDate?: string, endDate?: string) => {
      let q = `/analytics/income?period=${period}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<IncomeAnalyticsResponse>(q);
    },
    getInvestments: () => this.get<InvestmentAnalyticsResponse>('/analytics/investments'),
    getNetWorth: () => this.get<NetWorthAnalyticsResponse>('/analytics/net-worth'),
    createNetWorthSnapshot: (snapshotDate?: string) =>
      this.post<NetWorthSnapshotPoint>('/analytics/net-worth/snapshot', snapshotDate ? { snapshot_date: snapshotDate } : {}),
    getAnomalies: (period = 'this_month', startDate?: string, endDate?: string) => {
      let q = `/analytics/anomalies?period=${period}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<AnomalyResponse>(q);
    },
    getFinancialHealth: () => this.get<FinancialHealthResponse>('/analytics/financial-health'),
    getInsights: (period = 'this_month', startDate?: string, endDate?: string) => {
      let q = `/analytics/insights?period=${period}`;
      if (startDate) q += `&start_date=${startDate}`;
      if (endDate) q += `&end_date=${endDate}`;
      return this.get<InsightsResponse>(q);
    },
  };

  alerts = {
    list: (unreadOnly = false, limit = 50) => this.get<AlertResponse[]>(`/alerts?unread_only=false&limit=50`),
    summary: () => this.get<AlertSummary>('/alerts/summary'),
    markRead: (id: string) => this.patch<AlertResponse>(`/alerts/${id}/read`),
    evaluate: () => this.post<AlertResponse[]>('/alerts/evaluate'),
  };

  ai = {
    health: () =>
      this.get<AIHealthResponse>('/ai/health'),
    chat: (data: ChatRequest) =>
      this.post<ChatResponse>('/ai/chat', data),
    listConversations: () =>
      this.get<ConversationResponse[]>('/ai/conversations'),
    createConversation: (title?: string) =>
      this.request<ConversationResponse>(`/ai/conversations?title=${encodeURIComponent(title || 'New Financial Chat')}`, { method: 'POST' }),
    getConversation: (id: string) =>
      this.get<ConversationResponse>(`/ai/conversations/${id}`),
    listMessages: (id: string) =>
      this.get<MessageItemResponse[]>(`/ai/conversations/${id}/messages`),
    deleteConversation: (id: string) =>
      this.delete<void>(`/ai/conversations/${id}`),
  };
}

export const api = new ApiClient();
