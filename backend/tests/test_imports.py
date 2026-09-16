import pytest
import io
import json
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_csv_import_pipeline_and_deduplication(client: AsyncClient, auth_headers):
    # Create account
    acc_res = await client.post("/api/v1/accounts", headers=auth_headers, json={
        "name": "Import Checking",
        "account_type": "bank",
        "current_balance": 500.00
    })
    acc_id = acc_res.json()["id"]

    csv_data = b"""Date,Description,Amount,Type
2025-03-01,Whole Foods Market,120.50,expense
2025-03-02,Blue Bottle Coffee,6.50,expense
2025-03-03,Consulting Retainer,1500.00,income
"""
    # 1. Preview
    files = {"file": ("statement.csv", io.BytesIO(csv_data), "text/csv")}
    preview_res = await client.post(
        "/api/v1/imports/preview",
        headers=auth_headers,
        files=files,
        data={"account_id": acc_id}
    )
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["total_rows"] == 3
    assert pdata["suggested_mapping"]["date"] == "Date"
    assert pdata["suggested_mapping"]["amount"] == "Amount"

    # 2. Execute
    files2 = {"file": ("statement.csv", io.BytesIO(csv_data), "text/csv")}
    exec_res = await client.post(
        "/api/v1/imports/execute",
        headers=auth_headers,
        files=files2,
        data={
            "account_id": acc_id,
            "mapping": json.dumps(pdata["suggested_mapping"]),
            "skip_duplicates": "true"
        }
    )
    assert exec_res.status_code == 200
    res_data = exec_res.json()
    assert res_data["imported_count"] == 3
    assert res_data["skipped_duplicates_count"] == 0

    # 3. Duplicate Prevention (Re-importing identical statement)
    files3 = {"file": ("statement.csv", io.BytesIO(csv_data), "text/csv")}
    exec_res2 = await client.post(
        "/api/v1/imports/execute",
        headers=auth_headers,
        files=files3,
        data={
            "account_id": acc_id,
            "mapping": json.dumps(pdata["suggested_mapping"]),
            "skip_duplicates": "true"
        }
    )
    assert exec_res2.status_code == 200
    res_data2 = exec_res2.json()
    assert res_data2["imported_count"] == 0
    assert res_data2["skipped_duplicates_count"] == 3
