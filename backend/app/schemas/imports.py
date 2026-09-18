from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ColumnMapping(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[str] = None
    type: Optional[str] = None
    debit: Optional[str] = None
    credit: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None


class ImportPreviewResponse(BaseModel):
    filename: str
    total_rows: int
    detected_columns: List[str]
    suggested_mapping: ColumnMapping
    preview_rows: List[Dict[str, Any]]


class ImportExecuteRequest(BaseModel):
    account_id: str
    mapping: ColumnMapping
    default_currency: str = "INR"
    skip_duplicates: bool = True


class ImportErrorDetail(BaseModel):
    row_number: int
    reason: str
    data: Optional[Dict[str, Any]] = None


class ImportSummaryResponse(BaseModel):
    total_rows_processed: int
    imported_count: int
    skipped_duplicates_count: int
    failed_count: int
    errors: List[ImportErrorDetail]
