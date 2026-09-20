import json
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_current_user
from app.core.rate_limit import rate_limit_import
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.imports import (
    ColumnMapping,
    ImportPreviewResponse,
    ImportSummaryResponse,
)
from app.services.import_service import ImportService

router = APIRouter(prefix="/imports", tags=["Imports"])


@router.post("/preview", response_model=ImportPreviewResponse, dependencies=[Depends(rate_limit_import)])
async def preview_file(
    file: UploadFile = File(...),
    account_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded.")
    content = await file.read()
    service = ImportService(db)
    return await service.preview_file(
        content=content,
        filename=file.filename,
        user_id=current_user.id,
        account_id=account_id,
    )


@router.post("/execute", response_model=ImportSummaryResponse, dependencies=[Depends(rate_limit_import)])
async def execute_import(
    file: UploadFile = File(...),
    account_id: str = Form(...),
    mapping: str = Form(...),
    skip_duplicates: bool = Form(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded.")
    content = await file.read()
    try:
        mapping_dict = json.loads(mapping)
        col_mapping = ColumnMapping(**mapping_dict)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid column mapping JSON: {e}")

    service = ImportService(db)
    return await service.execute_import(
        content=content,
        filename=file.filename,
        user_id=current_user.id,
        account_id=account_id,
        mapping=col_mapping,
        skip_duplicates=skip_duplicates,
    )
