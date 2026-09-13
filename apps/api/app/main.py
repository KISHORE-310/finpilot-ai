from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import RequestLoggingMiddleware
from app.core.errors import FinPilotException
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
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Custom exception handler
@app.exception_handler(FinPilotException)
async def finpilot_exception_handler(request: Request, exc: FinPilotException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_code": exc.code}
    )

# Include Routers under API v1
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


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}
