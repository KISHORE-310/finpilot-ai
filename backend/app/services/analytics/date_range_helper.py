import calendar
import datetime
from datetime import date, timedelta
from typing import Optional, Tuple


def get_period_dates(
    period: str = "this_month",
    custom_start: Optional[date] = None,
    custom_end: Optional[date] = None,
) -> Tuple[date, date, date, date]:
    """
    Returns (start_date, end_date, prev_start_date, prev_end_date)
    """
    today = date.today()

    if period == "this_month":
        start_date = date(today.year, today.month, 1)
        end_date = today
        # Prev period: same number of days in previous month
        if today.month == 1:
            prev_year = today.year - 1
            prev_month = 12
        else:
            prev_year = today.year
            prev_month = today.month - 1
        _, last_day_prev = calendar.monthrange(prev_year, prev_month)
        prev_start_date = date(prev_year, prev_month, 1)
        prev_end_date = date(prev_year, prev_month, min(today.day, last_day_prev))

    elif period == "last_month":
        if today.month == 1:
            prev_year = today.year - 1
            prev_month = 12
        else:
            prev_year = today.year
            prev_month = today.month - 1
        _, last_day = calendar.monthrange(prev_year, prev_month)
        start_date = date(prev_year, prev_month, 1)
        end_date = date(prev_year, prev_month, last_day)

        # 2 months ago
        if prev_month == 1:
            p2_year = prev_year - 1
            p2_month = 12
        else:
            p2_year = prev_year
            p2_month = prev_month - 1
        _, last_day_p2 = calendar.monthrange(p2_year, p2_month)
        prev_start_date = date(p2_year, p2_month, 1)
        prev_end_date = date(p2_year, p2_month, last_day_p2)

    elif period == "last_3_months":
        start_date = today - timedelta(days=90)
        end_date = today
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=90)

    elif period == "last_6_months":
        start_date = today - timedelta(days=180)
        end_date = today
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=180)

    elif period == "this_year":
        start_date = date(today.year, 1, 1)
        end_date = today
        prev_start_date = date(today.year - 1, 1, 1)
        # Prev end matching same day last year (handling leap year safely)
        try:
            prev_end_date = date(today.year - 1, today.month, today.day)
        except ValueError:
            prev_end_date = date(today.year - 1, today.month, 28)

    elif period == "last_year":
        start_date = date(today.year - 1, 1, 1)
        end_date = date(today.year - 1, 12, 31)
        prev_start_date = date(today.year - 2, 1, 1)
        prev_end_date = date(today.year - 2, 12, 31)

    elif period == "custom" and custom_start and custom_end:
        # Guarantee start_date <= end_date even if inverted by client
        start_date = min(custom_start, custom_end)
        end_date = max(custom_start, custom_end)
        duration = (end_date - start_date).days
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=max(0, duration))

    else:
        # Default fallback to 30 days
        start_date = today - timedelta(days=30)
        end_date = today
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=30)

    return start_date, end_date, prev_start_date, prev_end_date
