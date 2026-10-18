import statistics
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.rate_limiter import analytics_rate_limiter

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset rate limiter state before each test."""
    analytics_rate_limiter.reset()
    yield
    analytics_rate_limiter.reset()


def test_compare_dataset_stats():
    """Tests fetching live dataset counts on both Oracle and Neo4j."""
    response = client.get("/api/compare/stats?dataset=demo")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["dataset"] == "demo"
    assert data["confirmedMatch"] is True

    # Both engines must report the exact same entities
    assert data["oracle"]["authors"] == 150
    assert data["oracle"]["papers"] == 110
    assert data["oracle"]["coauthorPairs"] == 301

    assert data["neo4j"]["authors"] == 150
    assert data["neo4j"]["papers"] == 110
    assert data["neo4j"]["coauthorPairs"] == 301


def test_compare_coauthors():
    """Scenario 1: co-authors of an author (1 hop)."""
    response = client.get("/api/compare/coauthors?authorId=1")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["scenario"] == "coauthors"
    assert data["resultsMatch"] is True
    assert data["oracle"]["rowCount"] == 5
    assert data["neo4j"]["rowCount"] == 5

    # 5 timings and calculated median
    assert len(data["oracle"]["timings"]) == 5
    assert len(data["neo4j"]["timings"]) == 5
    assert data["oracle"]["medianMs"] == round(statistics.median(data["oracle"]["timings"]), 2)
    assert data["neo4j"]["medianMs"] == round(statistics.median(data["neo4j"]["timings"]), 2)

    assert "why" in data["explanation"]


def test_compare_within_hops_2():
    """Scenario 2: authors within 2 co-author hops."""
    response = client.get("/api/compare/within-hops?authorId=1&hops=2")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["scenario"] == "within-hops"
    assert data["resultsMatch"] is True
    assert data["oracle"]["rowCount"] == 15
    assert data["neo4j"]["rowCount"] == 15


def test_compare_within_hops_3():
    """Scenario 2: authors within 3 co-author hops."""
    response = client.get("/api/compare/within-hops?authorId=1&hops=3")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["scenario"] == "within-hops"
    assert data["resultsMatch"] is True
    assert data["oracle"]["rowCount"] == 54
    assert data["neo4j"]["rowCount"] == 54


def test_compare_shortest_path():
    """Scenario 3: shortest collaboration path (breadth-first recursive CTE vs shortestPath)."""
    response = client.get("/api/compare/shortest-path?fromAuthorId=1&toAuthorId=60")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["scenario"] == "shortest-path"
    assert data["resultsMatch"] is True

    # Both find 3 hops
    ora_hops = data["oracle"]["sampleRows"][0]["hops"]
    neo_hops = data["neo4j"]["sampleRows"][0]["hops"]
    assert ora_hops == 3
    assert neo_hops == 3


def test_compare_conflict_check():
    """Scenario 4: conflict-of-interest check (blocked pairs & violations)."""
    response = client.get("/api/compare/conflict-check")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["scenario"] == "conflict-check"
    assert data["resultsMatch"] is True
    assert data["oracle"]["rowCount"] == 26
    assert data["neo4j"]["rowCount"] == 26

    # Violations should be 0 on both engines
    assert data["extra"]["existingViolations"]["oracle"] == 0
    assert data["extra"]["existingViolations"]["neo4j"] == 0
    assert data["extra"]["existingViolations"]["match"] is True


def test_compare_avg_score():
    """Scenario 5: average score per paper aggregation."""
    response = client.get("/api/compare/avg-score")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["scenario"] == "avg-score"
    assert data["resultsMatch"] is True
    assert data["oracle"]["rowCount"] == 110
    assert data["neo4j"]["rowCount"] == 110


def test_compare_scale_dataset_unseeded(monkeypatch):
    """Tests that requesting unseeded scale dataset returns clear HTTP 400 error."""
    import app.services.compare_service as cs
    monkeypatch.setattr(cs, "is_scale_available", lambda: (False, "Scale dataset has not been seeded yet"))
    response = client.get("/api/compare/coauthors?dataset=scale")
    assert response.status_code == 400
    assert "Scale dataset has not been seeded yet" in response.json()["detail"]


def test_compare_invalid_scenario():
    """Tests 400 response for invalid scenario name."""
    response = client.get("/api/compare/non-existent-scenario")
    assert response.status_code == 400
    assert "Unknown scenario" in response.json()["detail"]
