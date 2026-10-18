import subprocess
import sys
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def test_compare_dataset_status_endpoint():
    """Tests GET /api/compare/dataset-status returns accurate status structure."""
    response = client.get("/api/compare/dataset-status")
    assert response.status_code == 200, response.text
    data = response.json()

    assert "demo" in data
    assert data["demo"]["available"] is True

    assert "scale" in data
    assert "available" in data["scale"]
    assert "reason" in data["scale"]
    assert data["scale"]["neo4j_scale_db"] == settings.NEO4J_SCALE_DATABASE
    assert data["scale"]["oracle_scale_user"] == settings.ORACLE_SCALE_USER


def test_compare_stats_demo():
    """Tests /api/compare/stats with demo dataset."""
    response = client.get("/api/compare/stats?dataset=demo")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["dataset"] == "demo"
    assert data["confirmedMatch"] is True
    assert data["oracle"]["authors"] == 150
    assert data["neo4j"]["authors"] == 150


def test_scale_seeder_safety_check_without_confirm():
    """Verify scale_seed.py rejects execution without --confirm flag (Rule 8 safe execution)."""
    result = subprocess.run(
        [sys.executable, "scripts/scale_seed.py"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "Missing confirmation flag" in result.stdout or "Missing confirmation flag" in result.stderr
