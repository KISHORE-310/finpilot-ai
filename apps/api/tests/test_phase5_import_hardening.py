import pytest
from app.services.import_service import ImportService
from app.core.errors import FileValidationException


def test_import_unsupported_file_extension(db_session):
    service = ImportService(db_session)
    with pytest.raises(FileValidationException) as exc_info:
        service._parse_tabular_file(b"dummy text content", "transactions.txt")
    assert "Unsupported file format" in str(exc_info.value.detail)


def test_import_oversized_file_rejection(db_session):
    service = ImportService(db_session)
    # Simulate a file larger than MAX_UPLOAD_SIZE_BYTES (10MB)
    huge_content = b"a" * (11 * 1024 * 1024)
    with pytest.raises(FileValidationException) as exc_info:
        service._parse_tabular_file(huge_content, "transactions.csv")
    assert "exceeds the maximum allowed limit" in str(exc_info.value.detail)


def test_column_detection_and_inr_symbol_stripping(db_session):
    service = ImportService(db_session)
    headers = ["Date", "Narration", "Debit Amount", "Credit Amount"]
    mapping = service._detect_columns(headers)
    assert mapping.date == "Date"
    assert mapping.description == "Narration"
    assert mapping.debit == "Debit Amount"
    assert mapping.credit == "Credit Amount"
