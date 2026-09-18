"""
Shared, single source of truth for deriving display metrics from tool outputs.
Used by both the Phase 4 LangGraph nodes and the deterministic mock LLM so the
field mappings do not drift between implementations.
"""
from typing import Any, Dict, List, Tuple
from app.ai.schemas.chat import KeyMetric

CURRENCY_SYMBOL = "₹"


def money(value: Any) -> str:
    """Formats a raw monetary value with the configured currency symbol."""
    return f"{CURRENCY_SYMBOL}{value}"


# (tool_name, metric_key, label, kind)
_METRIC_DEFS: List[Tuple[str, str, str, str]] = [
    ("get_financial_overview", "net_worth", "Net Worth", "money"),
    ("get_financial_overview", "savings_rate_percentage", "Savings Rate", "percent"),
    ("get_financial_overview", "total_income", "Income", "money"),
    ("get_financial_overview", "total_expenses", "Expenses", "money"),
    ("get_cash_flow", "net_cash_flow", "Net Cash Flow", "money"),
    ("get_cash_flow", "savings_rate", "Savings Rate", "percent"),
    ("get_spending_analysis", "total_spending", "Total Expenses", "money"),
    ("get_budget_status", "overall_utilization", "Budget Utilization", "percent"),
    ("get_investment_summary", "current_value", "Portfolio Value", "money"),
    ("get_investment_summary", "pnl_percentage", "Portfolio Return", "percent"),
    ("get_financial_health", "overall_score", "Financial Health Score", "score"),
    ("get_net_worth", "net_worth", "Net Worth", "money"),
]


def _metric_values(tool_outputs: Dict[str, Any]) -> List[Tuple[str, str, str]]:
    """Returns ordered, de-duplicated (label, raw_value, kind) triples."""
    results: List[Tuple[str, str, str]] = []
    seen: List[str] = []
    for tool, key, label, kind in _METRIC_DEFS:
        d = tool_outputs.get(tool)
        if not isinstance(d, dict):
            continue
        if tool == "get_net_worth" and "net_worth" not in d:
            nested = d.get("current", {})
            if isinstance(nested, dict):
                d = nested
        value = d.get(key)
        if value is None or label in seen:
            continue
        seen.append(label)
        results.append((label, str(value), kind))
    return results


def _format_value(value: str, kind: str) -> str:
    if kind == "money":
        return money(value)
    if kind == "percent":
        return f"{value}%"
    if kind == "score":
        return f"{value}/100"
    return value


def extract_key_metrics(tool_outputs: Dict[str, Any]) -> List[KeyMetric]:
    """Builds the list of KeyMetric cards shown in the UI from tool outputs."""
    metrics = [
        KeyMetric(label=label, value=_format_value(value, kind))
        for label, value, kind in _metric_values(tool_outputs)
    ]
    return metrics[:5]


def metric_value(label: str, tool_outputs: Dict[str, Any], default: str = "0.00") -> str:
    """Returns the raw value for a labeled metric, or the default if absent."""
    for lbl, value, _kind in _metric_values(tool_outputs):
        if lbl == label:
            return value
    return default


def money_of(label: str, tool_outputs: Dict[str, Any], default: str = "0.00") -> str:
    """Returns the currency-formatted value for a labeled money metric."""
    return money(metric_value(label, tool_outputs, default))