import time
from typing import Any, Dict
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.logging import RequestLoggingMiddleware, logger
from app.core.errors import FinPilotException
from app.db.session import AsyncSessionLocal
from app.api.routes import (
    auth_router,
    accounts_router,
    categories_router,
    transactions_router,
    income_router,
    expenses_router,
    investments_router,
    goals_router,
    budgets_router,
    recurring_router,
    imports_router,
    dashboard_router,
    analytics_router,
    alerts_router,
    ai_router,
    calculators_router,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENVIRONMENT != "production" else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.ENVIRONMENT != "production" else None,
)

# 1. Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Request Logging & Tracking Middleware
app.add_middleware(RequestLoggingMiddleware)


# 4. Custom Application Exception Handler
@app.exception_handler(FinPilotException)
async def finpilot_exception_handler(request: Request, exc: FinPilotException):
    req_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.code,
            "request_id": req_id,
        },
        headers={"X-Request-ID": req_id},
    )


# 5. Global Unhandled Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"Unhandled internal exception (request_id={req_id}): {exc}", exc_info=True)
    
    # In production, do not leak raw stack trace details to client
    detail = "An internal server error occurred. Please contact support." if settings.ENVIRONMENT == "production" else str(exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": detail,
            "error_code": "INTERNAL_SERVER_ERROR",
            "request_id": req_id,
        },
        headers={"X-Request-ID": req_id},
    )


# 6. Include API Routers under API v1
api_v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1)
app.include_router(accounts_router, prefix=api_v1)
app.include_router(categories_router, prefix=api_v1)
app.include_router(transactions_router, prefix=api_v1)
app.include_router(income_router, prefix=api_v1)
app.include_router(expenses_router, prefix=api_v1)
app.include_router(investments_router, prefix=api_v1)
app.include_router(goals_router, prefix=api_v1)
app.include_router(budgets_router, prefix=api_v1)
app.include_router(recurring_router, prefix=api_v1)
app.include_router(imports_router, prefix=api_v1)
app.include_router(dashboard_router, prefix=api_v1)
app.include_router(analytics_router, prefix=api_v1)
app.include_router(alerts_router, prefix=api_v1)
app.include_router(ai_router, prefix=api_v1)
app.include_router(calculators_router, prefix=api_v1)


# 7. Production Health & Readiness Probes
@app.get("/health", tags=["Observability"])
async def liveness_probe() -> Dict[str, Any]:
    """Lightweight liveness probe checking that the application process is running."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/ready", tags=["Observability"])
async def readiness_probe():
    """Readiness probe verifying active PostgreSQL database connectivity."""
    db_status = "connected"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error(f"Readiness check database probe failed: {exc}")
        db_status = "unavailable"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": db_status,
                "error": "Database connectivity check failed",
            },
        )

    return {
        "status": "ready",
        "database": db_status,
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }
