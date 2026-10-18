import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["neo4j"]["status"] == "connected"
    assert data["neo4j"]["nodes"] == 444
    assert data["neo4j"]["relationships"] == 1643
    assert data["neo4j"]["same_person_as"] == 10

    assert data["oracle"]["status"] == "connected"
    assert data["oracle"]["total_rows"] == 1702
    assert data["oracle"]["tables"]["CONFERENCE"] == 5
    assert data["oracle"]["tables"]["PAPER"] == 110


def test_health_endpoint_degraded(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.health.check_neo4j_health",
        lambda: {"status": "unreachable", "uri": "bolt://127.0.0.1:7687", "database": "neo4j", "nodes": 0, "relationships": 0, "same_person_as": 0, "elapsed_ms": 1.0, "error": "Connection failed"},
    )
    monkeypatch.setattr(
        "app.routers.health.check_oracle_health",
        lambda: {"status": "unreachable", "dsn": "localhost:1521/FREEPDB1", "user": "academic", "tables": {}, "total_rows": 0, "elapsed_ms": 1.0, "error": "Connection failed"},
    )
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["neo4j"]["status"] == "unreachable"
    assert data["oracle"]["status"] == "unreachable"


def test_parity_endpoint(client):
    response = client.get("/api/admin/parity")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    data = body["data"]
    assert data["overall_match"] is True
    assert data["summary"]["unmatched_checks"] == 0
    assert len(data["rows"]) > 0


def test_reset_neo4j_auth_and_validation(client):
    # 1. Missing header
    res1 = client.post("/api/admin/reset-neo4j", json={"confirm": True})
    assert res1.status_code == 403

    # 2. Invalid header
    res2 = client.post("/api/admin/reset-neo4j", json={"confirm": True}, headers={"X-Admin-Token": "invalid-token"})
    assert res2.status_code == 403

    # 3. Valid token, confirm=False
    res3 = client.post("/api/admin/reset-neo4j", json={"confirm": False}, headers={"X-Admin-Token": settings.ADMIN_TOKEN})
    assert res3.status_code == 400

    # 4. Extra fields rejected (ConfigDict extra="forbid")
    res4 = client.post("/api/admin/reset-neo4j", json={"confirm": True, "extra_field": "disallowed"}, headers={"X-Admin-Token": settings.ADMIN_TOKEN})
    assert res4.status_code == 422
