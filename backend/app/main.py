import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.db_neo4j import init_neo4j_driver, close_neo4j_driver
from app.db_oracle import init_oracle_pool, close_oracle_pool
from app.routers import health, admin, graph, papers, recommend, oracle, profiles, analytics, compare

# Setup application logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database pools
    logger.info("Starting up Conference Graph API backend...")
    init_oracle_pool()
    init_neo4j_driver()
    yield
    # Shutdown: close connections
    logger.info("Shutting down Conference Graph API backend...")
    close_neo4j_driver()
    close_oracle_pool()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API comparing Neo4j and Oracle for the Academic Conference Management System",
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
    openapi_url="/openapi.json" if settings.ENV != "production" else None,
    lifespan=lifespan,
)


MAX_REQUEST_BODY_BYTES = 1024 * 1024  # 1 MB (Section 11.1 rule 9)


class RequestBodyLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_REQUEST_BODY_BYTES:
                    return JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        content={
                            "error": "PAYLOAD_TOO_LARGE",
                            "detail": f"Request body exceeds maximum allowed size of {MAX_REQUEST_BODY_BYTES} bytes (1MB).",
                        },
                    )
            except ValueError:
                pass
        elif request.method in ("POST", "PUT", "PATCH") and request.headers.get("transfer-encoding") == "chunked":
            body = await request.body()
            if len(body) > MAX_REQUEST_BODY_BYTES:
                return JSONResponse(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    content={
                        "error": "PAYLOAD_TOO_LARGE",
                        "detail": f"Request body exceeds maximum allowed size of {MAX_REQUEST_BODY_BYTES} bytes (1MB).",
                    },
                )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Apply mandatory security headers (Section 11.1 rule 12)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Frame-Options"] = "DENY"
        # Exempt API documentation routes from strict 'none' CSP so Swagger/Redoc UI can render in dev (B21)
        if request.url.path in ("/docs", "/redoc", "/openapi.json"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://fastapi.tiangolo.com; "
                "frame-ancestors 'none';"
            )
        else:
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none';"
        return response


app.add_middleware(RequestBodyLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration bound to ALLOWED_ORIGIN (Section 11.1 rule 6)
# Supports single origin, comma-separated list, or regex pattern for preview deployments
allowed_origins_list = [o.strip() for o in settings.ALLOWED_ORIGIN.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Token", "Authorization"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = uuid.uuid4().hex[:8]
    exc_str = str(exc)

    # Map query timeouts (DPY-4011 / TransactionTimedOut) to HTTP 504 (B26)
    if "DPY-4011" in exc_str or "TransactionTimedOut" in exc_str or "timed out" in exc_str.lower():
        logger.warning("Database query timeout [error_id=%s] on %s %s: %s", error_id, request.method, request.url.path, exc_str)
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content={
                "error": "GATEWAY_TIMEOUT",
                "error_id": error_id,
                "detail": "Database query timed out before completion.",
            },
        )

    # Map database availability failures to HTTP 503 (B26)
    if "not available" in exc_str.lower() or "connection pool" in exc_str.lower() or "failed to connect" in exc_str.lower():
        logger.warning("Database unavailable [error_id=%s] on %s %s: %s", error_id, request.method, request.url.path, exc_str)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "SERVICE_UNAVAILABLE",
                "error_id": error_id,
                "detail": "Database service is currently unavailable.",
            },
        )

    logger.error("Unhandled exception [error_id=%s] on %s %s: %s", error_id, request.method, request.url.path, exc_str, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "error_id": error_id,
            "detail": "An unexpected server error occurred. Please contact administrator with the error ID.",
        },
    )


# Include API Routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(papers.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")
app.include_router(oracle.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(compare.router, prefix="/api")


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "health_check": "/api/health",
        "parity_check": "/api/admin/parity",
    }
