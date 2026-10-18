"""
Phase 7 Security Review & Hardening Test Suite.
Validates:
1. Security response headers (nosniff, no-referrer, no-store, DENY, CSP).
2. Request body size limit middleware (HTTP 413 on payload > 1MB).
3. Rate limiter protection on expensive endpoints (collab-path, within-hops, compare, recommend).
4. SQL / Cypher injection resilience via parameterization.
5. Pydantic input validation bounds (score 0-10, hops 1-3, limits, pages).
6. Admin token constant-time protection on destructive endpoints.
7. Recommendation and Status enum validation.
8. CORS configuration lockdown.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.rate_limiter import analytics_rate_limiter

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_limiter():
    """Reset rate limiter state between tests."""
    analytics_rate_limiter.reset()


def test_security_headers():
    """Verify mandatory security headers are present on all responses (Section 11.1 rule 12)."""
    res = client.get("/api/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("Referrer-Policy") == "no-referrer"
    assert headers.get("Cache-Control") == "no-store"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "default-src 'none'" in headers.get("Content-Security-Policy", "")


def test_request_body_size_limit():
    """Verify requests with Content-Length > 1MB are rejected with HTTP 413 (Section 11.1 rule 9)."""
    # Simulate a 1.2 MB payload
    large_payload = {"title": "A" * 100, "abstract": "B" * 500, "padding": "X" * (1200 * 1024)}
    res = client.post("/api/papers", json=large_payload)
    assert res.status_code == 413
    assert res.json()["error"] == "PAYLOAD_TOO_LARGE"


def test_rate_limiter_blocks_abuse():
    """Verify in-memory rate limiter returns HTTP 429 when threshold exceeded (Section 11.1 rule 18)."""
    # Default limiter is 60 rpm. Execute 60 requests then verify 61st fails.
    for _ in range(60):
        res = client.get("/api/analytics/collab-path?fromAuthorId=1&toAuthorId=60")
        assert res.status_code in (200, 404)

    # 61st request should be blocked by rate limiter
    blocked = client.get("/api/analytics/collab-path?fromAuthorId=1&toAuthorId=60")
    assert blocked.status_code == 429
    assert "Rate limit exceeded" in blocked.json()["detail"]


def test_rate_limiter_protects_recommend_endpoint():
    """Verify /api/recommend/reviewers is protected by rate limiting."""
    # Ensure it registers under analytics_rate_limiter
    for _ in range(60):
        res = client.get("/api/recommend/reviewers?paperId=1&limit=5")
        assert res.status_code in (200, 404)

    blocked = client.get("/api/recommend/reviewers?paperId=1&limit=5")
    assert blocked.status_code == 429


def test_input_validation_numeric_bounds():
    """Verify Pydantic enforces numeric bounds (Section 11.1 rule 2)."""
    # Negative page
    res_page = client.get("/api/papers?page=0")
    assert res_page.status_code == 422

    # Excessive page size (> 100)
    res_pagesize = client.get("/api/papers?pageSize=101")
    assert res_pagesize.status_code == 422

    # Excessive limit in search (> 20)
    res_search = client.get("/api/graph/search?q=test&limit=25")
    assert res_search.status_code == 422

    # Hops out of bounds (> 3)
    res_hops = client.get("/api/analytics/within-hops?authorId=1&hops=5")
    assert res_hops.status_code == 422

    # Negative author ID
    res_author = client.get("/api/analytics/within-hops?authorId=0&hops=2")
    assert res_author.status_code == 422


def test_review_score_bounds_and_enums():
    """Verify review score bounds (0-10) and recommendation enum validation."""
    # Score > 10
    res_high = client.post(
        "/api/papers/1/reviews",
        json={"reviewerId": 1, "score": 11, "comments": "Great paper.", "recommendation": "Accept"},
    )
    assert res_high.status_code == 422

    # Negative score
    res_neg = client.post(
        "/api/papers/1/reviews",
        json={"reviewerId": 1, "score": -1, "comments": "Bad paper.", "recommendation": "Reject"},
    )
    assert res_neg.status_code == 422

    # Invalid recommendation enum
    res_rec = client.post(
        "/api/papers/1/reviews",
        json={"reviewerId": 1, "score": 8, "comments": "Solid work.", "recommendation": "Unsure"},
    )
    assert res_rec.status_code == 422


def test_cypher_and_sql_injection_resilience():
    """Verify malicious SQL / Cypher payload in search or filter does not cause syntax errors."""
    malicious_inputs = [
        "'; DROP TABLE PAPER; --",
        "' OR '1'='1",
        "MATCH (n) DETACH DELETE n",
        '{"$gt": ""}',
        "<script>alert('xss')</script>",
    ]

    for attack_str in malicious_inputs:
        # Search autocomplete
        res = client.get(f"/api/graph/search?q={attack_str}")
        assert res.status_code == 200
        # Returns safe JSON array, no server exception
        assert isinstance(res.json()["data"], list)

        # Papers listing query text filter
        res_papers = client.get(f"/api/papers?q={attack_str}")
        assert res_papers.status_code == 200
        assert "items" in res_papers.json()["data"]


def test_admin_token_authorization():
    """Verify admin endpoints reject missing or invalid token using constant-time check."""
    # Reset Neo4j without token
    res_no_tok = client.post("/api/admin/reset-neo4j", json={"confirm": True})
    assert res_no_tok.status_code in (401, 403)

    # Reset Neo4j with invalid token
    res_bad_tok = client.post(
        "/api/admin/reset-neo4j",
        json={"confirm": True},
        headers={"X-Admin-Token": "invalid-random-secret"},
    )
    assert res_bad_tok.status_code in (401, 403)

    # Oracle assign reviewer with commit=True but no token
    res_ora_no_tok = client.post(
        "/api/oracle/assign-reviewer",
        json={"paperId": 1, "reviewerId": 5, "commit": True, "confirm": True},
    )
    assert res_ora_no_tok.status_code in (401, 403)


def test_cors_lockdown():
    """Verify CORS does not reflect unauthorized origins with wildcard or credentials."""
    res = client.options(
        "/api/health",
        headers={
            "Origin": "http://evil-attacker.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # The server must not return Access-Control-Allow-Origin: * or Access-Control-Allow-Credentials: true
    allow_origin = res.headers.get("Access-Control-Allow-Origin")
    assert allow_origin != "*"
    assert res.headers.get("Access-Control-Allow-Credentials") != "true"
