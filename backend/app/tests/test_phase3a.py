import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_list_papers(client):
    res = client.get("/api/papers?page=1&pageSize=10")
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["engine"] == "neo4j"
    data = body["data"]
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 110
    assert len(data["items"]) <= 10
    first = data["items"][0]
    assert "paperId" in first
    assert "title" in first
    assert "status" in first
    assert "authors" in first
    assert "keywords" in first


def test_get_paper_details(client):
    res = client.get("/api/papers/1")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["paperId"] == 1
    assert data["title"] == "A Study of Approximate Nearest Neighbour Search with Provable Guarantees"
    assert "conference" in data
    assert "track" in data
    assert len(data["authors"]) >= 1
    assert len(data["keywords"]) >= 1
    assert len(data["assignments"]) >= 1
    assert len(data["reviews"]) >= 1
    assert data["avgScore"] is not None


def test_paper_validation_strict(client):
    # Title > 250 characters
    long_title = "A" * 251
    res = client.post("/api/papers", json={
        "title": long_title,
        "abstract": "Valid abstract",
        "confId": 1,
        "trackId": 2,
        "authorIds": [1],
    })
    assert res.status_code == 422

    # Abstract > 1000 characters
    long_abstract = "B" * 1001
    res = client.post("/api/papers", json={
        "title": "Valid title",
        "abstract": long_abstract,
        "confId": 1,
        "trackId": 2,
        "authorIds": [1],
    })
    assert res.status_code == 422

    # Forbidden extra fields (extra="forbid")
    res = client.post("/api/papers", json={
        "title": "Valid title",
        "abstract": "Valid abstract",
        "confId": 1,
        "trackId": 2,
        "authorIds": [1],
        "unexpected_field": "hacker_payload",
    })
    assert res.status_code == 422


def test_conflict_of_interest_blocked(client):
    # From da3_coi_test_pairs.csv: Paper 1 and Reviewer 2 (Dr. David Nair is author 70 David Nair)
    res = client.post("/api/papers/1/assignments", json={"reviewerId": 2})
    assert res.status_code == 409
    body = res.json()
    assert "detail" in body
    detail = body["detail"]
    assert detail["error"] == "CONFLICT_OF_INTEREST"
    assert "explanation" in detail
    assert "path" in detail
    path = detail["path"]
    assert "nodes" in path
    assert "edges" in path
    assert len(path["nodes"]) == 3
    assert any(n["type"] == "Reviewer" for n in path["nodes"])
    assert any(n["type"] == "Author" for n in path["nodes"])
    assert any(n["type"] == "Paper" for n in path["nodes"])
    assert any(e["type"] == "SAME_PERSON_AS" for e in path["edges"])
    assert any(e["type"] == "WROTE" for e in path["edges"])


def test_recommend_reviewers(client):
    res = client.get("/api/recommend/reviewers?paperId=1&limit=5")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["paperId"] == 1
    assert "scoring_model" in data
    recs = data["recommendations"]
    assert len(recs) > 0
    # Conflicting reviewer 2 should NOT be recommended
    assert all(r["reviewerId"] != 2 for r in recs)
    first = recs[0]
    assert "reviewerId" in first
    assert "name" in first
    assert "totalScore" in first
    assert "sharedKeywordCount" in first
    assert "expertiseScore" in first
    assert "workload" in first


def test_demo_coi_pairs(client):
    res = client.get("/api/demo/coi-pairs")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["count"] == 8
    items = data["items"]
    assert len(items) == 8
    # Pair (1, 2) should be present
    pair_1_2 = next((p for p in items if p["paperId"] == 1 and p["reviewerId"] == 2), None)
    assert pair_1_2 is not None
    assert "reviewerName" in pair_1_2
    assert "conflictingAuthorName" in pair_1_2


def test_review_validation(client):
    # Score out of bounds (> 10)
    res = client.post("/api/papers/1/reviews", json={
        "reviewerId": 14,
        "score": 11,
        "comments": "Great work",
        "recommendation": "Accept",
    })
    assert res.status_code == 422

    # Negative score (< 0)
    res = client.post("/api/papers/1/reviews", json={
        "reviewerId": 14,
        "score": -1,
        "comments": "Poor work",
        "recommendation": "Reject",
    })
    assert res.status_code == 422

    # Invalid recommendation enum
    res = client.post("/api/papers/1/reviews", json={
        "reviewerId": 14,
        "score": 8,
        "comments": "Good work",
        "recommendation": "Maybe",
    })
    assert res.status_code == 422

    # Review without assignment
    res = client.post("/api/papers/1/reviews", json={
        "reviewerId": 9999,
        "score": 8,
        "comments": "Good work",
        "recommendation": "Accept",
    })
    assert res.status_code in (400, 404)


def test_oracle_dry_run_conflict(client):
    res = client.post("/api/oracle/assign-reviewer", json={
        "paperId": 1,
        "reviewerId": 2,
        "commit": False,
    })
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["dry_run"] is True
    assert data["conflict"] is True
    assert data["would_succeed"] is False
    assert "ORA-20001" in data["procedure_error"]
    assert "ORA-20002" in data["trigger_error"]


def test_author_and_reviewer_profiles(client):
    # Author 1 (Emma Krishnan)
    res_a = client.get("/api/authors/1")
    assert res_a.status_code == 200
    author = res_a.json()["data"]
    assert author["authorId"] == 1
    assert "name" in author
    assert "papers" in author
    assert "coAuthors" in author

    # Reviewer 2 (Dr. David Nair - linked to Author 70)
    res_r = client.get("/api/reviewers/2")
    assert res_r.status_code == 200
    reviewer = res_r.json()["data"]
    assert reviewer["reviewerId"] == 2
    assert "name" in reviewer
    assert reviewer["linkedAuthorId"] == 70
    assert "workload" in reviewer
    assert "assignedPapers" in reviewer


def test_paper_lifecycle_and_auto_accept(client):
    # 1. Create a fresh test paper
    create_payload = {
        "title": "Phase 3a Automated Lifecycle Test Paper",
        "abstract": "Evaluation of graph database queries and transactional consistency.",
        "confId": 1,
        "trackId": 2,
        "authorIds": [1, 2],
        "correspondingAuthorId": 1,
        "keywordIds": [13, 20],
    }
    create_res = client.post("/api/papers", json=create_payload)
    assert create_res.status_code == 201
    created_paper = create_res.json()["data"]
    test_pid = created_paper["paperId"]
    assert created_paper["status"] == "Submitted"

    try:
        # 2. Patch paper title
        patch_res = client.patch(f"/api/papers/{test_pid}", json={
            "title": "Phase 3a Automated Lifecycle Test Paper (Updated)",
        })
        assert patch_res.status_code == 200
        assert patch_res.json()["data"]["title"] == "Phase 3a Automated Lifecycle Test Paper (Updated)"

        # 3. Find a safe reviewer to assign (e.g. from recommender)
        rec_res = client.get(f"/api/recommend/reviewers?paperId={test_pid}&limit=3")
        assert rec_res.status_code == 200
        safe_reviewer_id = rec_res.json()["data"]["recommendations"][0]["reviewerId"]

        # 4. Assign reviewer
        assign_res = client.post(f"/api/papers/{test_pid}/assignments", json={
            "reviewerId": safe_reviewer_id,
        })
        assert assign_res.status_code == 200
        # Paper should flip from 'Submitted' to 'Under Review'
        assert assign_res.json()["data"]["paperStatus"] == "Under Review"

        # 5. Submit review with score 9 -> trigger auto-accept rule (replicates trg_flag_paper)
        review_res = client.post(f"/api/papers/{test_pid}/reviews", json={
            "reviewerId": safe_reviewer_id,
            "score": 9,
            "comments": "Outstanding paper, clear methodology.",
            "recommendation": "Accept",
        })
        assert review_res.status_code == 201
        review_data = review_res.json()["data"]
        assert review_data["score"] == 9
        assert review_data["autoAccepted"] is True
        assert review_data["paperStatus"] == "Accepted"

        # Verify paper status is now Accepted
        get_res = client.get(f"/api/papers/{test_pid}")
        assert get_res.status_code == 200
        assert get_res.json()["data"]["status"] == "Accepted"

        # 6. Reject duplicate review
        dup_res = client.post(f"/api/papers/{test_pid}/reviews", json={
            "reviewerId": safe_reviewer_id,
            "score": 8,
            "comments": "Duplicate submission attempt",
            "recommendation": "Accept",
        })
        assert dup_res.status_code == 400

    finally:
        # Clean up: verify unauthenticated delete is rejected (B1)
        unauth_del = client.delete(f"/api/papers/{test_pid}?confirm=true")
        assert unauth_del.status_code == 403

        # Clean up: delete test paper with confirm: true and valid admin token
        del_res = client.delete(
            f"/api/papers/{test_pid}?confirm=true",
            headers={"X-Admin-Token": settings.ADMIN_TOKEN},
        )
        assert del_res.status_code == 200
        # Subsequent get should 404
        assert client.get(f"/api/papers/{test_pid}").status_code == 404
