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


def test_collab_path_success():
    """Tests finding the shortest collaboration path between Author 1 and Author 60 (3 hops)."""
    response = client.get("/api/analytics/collab-path?fromAuthorId=1&toAuthorId=60")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["found"] is True
    assert data["hops"] == 3
    assert data["fromAuthor"]["authorId"] == 1
    assert data["toAuthor"]["authorId"] == 60
    assert len(data["papers"]) == 3

    # Cytoscape graph nodes and edges
    path = data["path"]
    assert len(path["nodes"]) == 7  # 4 Authors + 3 Papers
    assert len(path["edges"]) == 6  # 6 WROTE edges connecting them
    for edge in path["edges"]:
        assert edge["type"] == "WROTE"

    assert "Emma Krishnan" in data["explanation"]
    assert "Lukas Reddy" in data["explanation"]
    assert "cypher" in data


def test_collab_path_same_author():
    """Tests querying collaboration path where fromAuthorId equals toAuthorId (0 hops)."""
    response = client.get("/api/analytics/collab-path?fromAuthorId=1&toAuthorId=1")
    assert response.status_code == 200
    data = response.json()

    assert data["found"] is True
    assert data["hops"] == 0
    assert len(data["path"]["nodes"]) == 1
    assert len(data["path"]["edges"]) == 0
    assert "Same author" in data["explanation"]


def test_collab_path_author_not_found():
    """Tests 404 response when one or both authors do not exist."""
    response = client.get("/api/analytics/collab-path?fromAuthorId=99999&toAuthorId=1")
    assert response.status_code == 404
    assert "Author ID 99999 not found" in response.json()["detail"]


def test_collab_path_validation():
    """Tests input validation for non-positive author IDs."""
    response = client.get("/api/analytics/collab-path?fromAuthorId=0&toAuthorId=1")
    assert response.status_code in (400, 422)


def test_within_hops_validation():
    """Tests input validation for hops outside [1, 3] and non-existent author."""
    # Hops = 0 (below min 1)
    res_low = client.get("/api/analytics/within-hops?authorId=1&hops=0")
    assert res_low.status_code in (400, 422)

    # Hops = 4 (above max 3)
    res_high = client.get("/api/analytics/within-hops?authorId=1&hops=4")
    assert res_high.status_code in (400, 422)

    # Author not found
    res_nf = client.get("/api/analytics/within-hops?authorId=99999&hops=1")
    assert res_nf.status_code == 404


def test_within_hops_counts_and_expansion():
    """Tests that within-hops returns correct counts for Author 1 at hops 1, 2, and 3."""
    # Hop 1
    res1 = client.get("/api/analytics/within-hops?authorId=1&hops=1")
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["hops"] == 1
    assert d1["totalReachable"] == 5
    assert d1["byHop"]["1"] == 5

    # Hop 2
    res2 = client.get("/api/analytics/within-hops?authorId=1&hops=2")
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["hops"] == 2
    assert d2["totalReachable"] == 15
    assert d2["byHop"]["1"] == 5
    assert d2["byHop"]["2"] == 10

    # Hop 3
    res3 = client.get("/api/analytics/within-hops?authorId=1&hops=3")
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["hops"] == 3
    assert d3["totalReachable"] == 54


def test_central_authors():
    """Tests retrieval of top central authors ranked by degree and paper count."""
    response = client.get("/api/analytics/central-authors?limit=5")
    assert response.status_code == 200
    data = response.json()

    assert data["limit"] == 5
    assert len(data["authors"]) == 5

    # Top author should be Yuki Zhang
    top = data["authors"][0]
    assert top["name"] == "Yuki Zhang"
    assert top["distinctCoauthors"] == 30
    assert top["paperCount"] == 15

    # Verify descending sort order
    degrees = [a["distinctCoauthors"] for a in data["authors"]]
    assert degrees == sorted(degrees, reverse=True)


def test_central_authors_limit_validation():
    """Tests validation of limit parameter for central-authors."""
    res_zero = client.get("/api/analytics/central-authors?limit=0")
    assert res_zero.status_code in (400, 422)

    res_too_large = client.get("/api/analytics/central-authors?limit=101")
    assert res_too_large.status_code in (400, 422)


def test_institutions_analytics():
    """Tests cross-institution collaboration pairs, research area paper counts, and track stats."""
    response = client.get("/api/analytics/institutions?limit=10")
    assert response.status_code == 200
    data = response.json()

    # Cross-institution pairs
    pairs = data["institutionPairs"]
    assert len(pairs) == 10
    assert pairs[0]["jointPapers"] >= 7
    assert pairs[0]["institution1"] < pairs[0]["institution2"]

    # Research areas breakdown
    areas = data["researchAreas"]
    assert len(areas) == 5
    area_names = {a["areaName"] for a in areas}
    assert "Databases" in area_names
    assert "NLP" in area_names
    assert "Security & Privacy" in area_names
    assert data["totalPapers"] == 110

    # Tracks
    tracks = data["tracks"]
    assert len(tracks) == 17

    # Top institutions
    top_insts = data["topInstitutions"]
    assert len(top_insts) > 0


def test_rate_limiter_blocks_on_excess():
    """Tests that rate limiter raises 429 when client exceeds limit."""
    limiter = analytics_rate_limiter
    original_rpm = limiter.rpm
    try:
        limiter.rpm = 3
        # First 3 requests succeed
        for _ in range(3):
            res = client.get("/api/analytics/within-hops?authorId=1&hops=1")
            assert res.status_code == 200

        # 4th request must be 429
        res_blocked = client.get("/api/analytics/within-hops?authorId=1&hops=1")
        assert res_blocked.status_code == 429
        assert "Rate limit exceeded" in res_blocked.json()["detail"]
    finally:
        limiter.rpm = original_rpm
        limiter.reset()
