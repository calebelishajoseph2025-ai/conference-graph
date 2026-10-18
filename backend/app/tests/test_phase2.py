import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_search_endpoint(client):
    res = client.get("/api/graph/search?q=emma")
    assert res.status_code == 200
    json_data = res.json()
    assert "data" in json_data
    assert "meta" in json_data
    assert json_data["meta"]["engine"] == "neo4j"
    data = json_data["data"]
    assert len(data) > 0
    # Emma Krishnan should be among results
    assert any(item["title"] == "Emma Krishnan" for item in data)


def test_search_type_filter(client):
    res = client.get("/api/graph/search?q=emma&type=author")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) > 0
    assert all(item["type"] == "author" for item in data)


def test_search_invalid_type(client):
    res = client.get("/api/graph/search?q=emma&type=invalid_type")
    assert res.status_code == 400


def test_neighborhood_depth_1(client):
    res = client.get("/api/graph/neighborhood?type=author&id=1&depth=1")
    assert res.status_code == 200
    json_data = res.json()
    data = json_data["data"]
    meta = json_data["meta"]

    assert "nodes" in data
    assert "edges" in data
    assert meta["engine"] == "neo4j"
    assert "elapsed_ms" in meta
    assert len(data["nodes"]) > 0
    # Center node should be present
    assert any(n["id"] == "Author:1" for n in data["nodes"])


def test_neighborhood_depth_2_capped(client):
    res = client.get("/api/graph/neighborhood?type=author&id=1&depth=2")
    assert res.status_code == 200
    data = res.json()["data"]
    # Rule: strictly capped at <= 150 nodes
    assert len(data["nodes"]) <= 150
    assert len(data["nodes"]) >= 1


def test_neighborhood_invalid_type(client):
    res = client.get("/api/graph/neighborhood?type=unknown&id=1&depth=1")
    assert res.status_code == 400


def test_overview_endpoint(client):
    res = client.get("/api/graph/overview?confId=1")
    assert res.status_code == 200
    json_data = res.json()
    data = json_data["data"]
    meta = json_data["meta"]

    assert "nodes" in data
    assert "edges" in data
    assert meta["engine"] == "neo4j"
    assert len(data["nodes"]) > 0
    # Conference 1 must be among nodes
    assert any(n["id"] == "Conference:1" for n in data["nodes"])
