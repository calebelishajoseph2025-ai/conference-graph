#!/usr/bin/env python3
"""
Conference Graph Explorer — Comprehensive Live Smoke Test Script
Calls all major API endpoints against live Neo4j and Oracle instances.
Prints formatted PASS/FAIL results, measured response latencies, and summary.
Exit code: 0 on all pass, 1 on any failure.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple, Optional

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = os.getenv("BACKEND_URL", sys.argv[1].rstrip("/") if len(sys.argv) > 1 and sys.argv[1].startswith("http") else "http://127.0.0.1:8000")

# ANSI Colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def request(
    method: str,
    path: str,
    body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
) -> Tuple[int, Any, float]:
    """Execute HTTP request against the backend server."""
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req_headers = {"Accept": "application/json"}
    if body is not None:
        req_headers["Content-Type"] = "application/json"
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)

    t0 = time.perf_counter()
    status = 500
    res_body = None
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            raw = resp.read().decode("utf-8")
            res_body = json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            res_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            res_body = {"raw": str(e)}
    except Exception as e:
        status = 0
        res_body = {"error": str(e)}
    elapsed = (time.perf_counter() - t0) * 1000.0

    return status, res_body, elapsed


def run_test(
    num: int,
    name: str,
    method: str,
    path: str,
    expected_status: int = 200,
    body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    validator=None,
) -> bool:
    """Run an individual test case and output formatted status."""
    status, res_json, elapsed = request(method, path, body, headers)

    passed = status == expected_status
    detail = ""

    if passed and validator:
        try:
            val_ok, detail = validator(res_json)
            if not val_ok:
                passed = False
        except Exception as ex:
            passed = False
            detail = f"Validator raised: {ex}"
    elif not passed:
        detail = f"Expected HTTP {expected_status}, got {status}: {str(res_json)[:120]}"

    status_tag = f"{GREEN}[PASS]{RESET}" if passed else f"{RED}[FAIL]{RESET}"
    time_tag = f"{CYAN}{elapsed:6.1f}ms{RESET}"
    print(f"  {num:2d}. {status_tag} {time_tag}  {BOLD}{name:<48}{RESET} ({method} {path})")
    if not passed and detail:
        print(f"       {RED}|-- {detail}{RESET}")

    return passed


def main():
    print(f"\n{BOLD}{CYAN}================================================================={RESET}")
    print(f"{BOLD}  Conference Graph Explorer -- Live Database Smoke Test Suite{RESET}")
    print(f"  Target: {BASE_URL}")
    print(f"{BOLD}{CYAN}================================================================={RESET}\n")

    tests = [
        (
            "System Health (Dual Databases Connected)",
            "GET",
            "/api/health",
            200,
            None,
            None,
            lambda res: (
                res.get("neo4j", {}).get("status") == "connected"
                and res.get("oracle", {}).get("status") == "connected"
                and res.get("neo4j", {}).get("nodes") == 444,
                f"Neo4j: {res.get('neo4j', {}).get('nodes')} nodes, Oracle: {res.get('oracle', {}).get('total_rows')} rows",
            ),
        ),
        (
            "Parity Audit (18+ Metrics Checked)",
            "GET",
            "/api/admin/parity",
            200,
            None,
            None,
            lambda res: (
                res.get("data", {}).get("overall_match") is True
                and res.get("data", {}).get("summary", {}).get("total_checks", 0) >= 18,
                f"Matched: {res.get('data', {}).get('summary', {}).get('matched_checks')}/{res.get('data', {}).get('summary', {}).get('total_checks')}",
            ),
        ),
        (
            "Graph Autocomplete Search (Author 'Emma')",
            "GET",
            "/api/graph/search?q=Emma&type=author",
            200,
            None,
            None,
            lambda res: (
                len(res.get("data", [])) > 0 and "Emma" in res.get("data", [])[0].get("title", ""),
                f"Found {len(res.get('data', []))} match(es), top: {res.get('data', [])[0].get('title')}",
            ),
        ),
        (
            "Neighborhood Traversal (Author 1, Depth 1)",
            "GET",
            "/api/graph/neighborhood?type=author&id=1&depth=1",
            200,
            None,
            None,
            lambda res: (
                len(res.get("data", {}).get("nodes", [])) > 0,
                f"{len(res.get('data', {}).get('nodes', []))} nodes, {len(res.get('data', {}).get('edges', []))} edges",
            ),
        ),
        (
            "Conference Starter Overview (Conf 1)",
            "GET",
            "/api/graph/overview?confId=1",
            200,
            None,
            None,
            lambda res: (
                len(res.get("data", {}).get("nodes", [])) > 0,
                f"{len(res.get('data', {}).get('nodes', []))} nodes in overview",
            ),
        ),
        (
            "List Papers (Paginated & Filtered)",
            "GET",
            "/api/papers?page=1&pageSize=5",
            200,
            None,
            None,
            lambda res: (
                len(res.get("data", {}).get("items", [])) == 5
                and res.get("data", {}).get("total", 0) >= 110,
                f"Total papers: {res.get('data', {}).get('total')}",
            ),
        ),
        (
            "Get Paper Details (Paper 1 with Authors)",
            "GET",
            "/api/papers/1",
            200,
            None,
            None,
            lambda res: (
                res.get("data", {}).get("paperId") == 1
                and len(res.get("data", {}).get("authors", [])) > 0,
                f"Title: {res.get('data', {}).get('title', '')[:35]}...",
            ),
        ),
        (
            "Get Author Profile (Author 1: Emma Krishnan)",
            "GET",
            "/api/authors/1",
            200,
            None,
            None,
            lambda res: (
                res.get("data", {}).get("authorId") == 1
                and "Emma" in res.get("data", {}).get("name", ""),
                f"Affiliation: {res.get('data', {}).get('affiliation')}",
            ),
        ),
        (
            "Get Reviewer Profile (Reviewer 1)",
            "GET",
            "/api/reviewers/1",
            200,
            None,
            None,
            lambda res: (
                res.get("data", {}).get("reviewerId") == 1
                and "expertise" in res.get("data", {}),
                f"Expertise: {res.get('data', {}).get('expertise')}",
            ),
        ),
        (
            "Demo COI Benchmark Pairs (8 Pairs)",
            "GET",
            "/api/demo/coi-pairs",
            200,
            None,
            None,
            lambda res: (
                len(res.get("data", {}).get("items", [])) == 8,
                f"Loaded {len(res.get('data', {}).get('items', []))} test pairs",
            ),
        ),
        (
            "Explainable Reviewer Recommender (Paper 1)",
            "GET",
            "/api/recommend/reviewers?paperId=1&limit=5",
            200,
            None,
            None,
            lambda res: (
                len(res.get("data", {}).get("recommendations", [])) > 0
                and "keywordScore" in res.get("data", {}).get("recommendations", [])[0],
                f"Top candidate: {res.get('data', {}).get('recommendations', [])[0].get('name')} (totalScore: {res.get('data', {}).get('recommendations', [])[0].get('totalScore')})",
            ),
        ),
        (
            "Oracle Conflict Check (Dry-Run ORA-20001/ORA-20002)",
            "POST",
            "/api/oracle/assign-reviewer",
            200,
            {"paperId": 1, "reviewerId": 2, "commit": False},
            None,
            lambda res: (
                res.get("data", {}).get("conflict") is True
                and "ORA-20001" in res.get("data", {}).get("procedure_error", "")
                and "ORA-20002" in res.get("data", {}).get("trigger_error", ""),
                "Captured real ORA-20001 and ORA-20002 errors",
            ),
        ),
        (
            "Shortest Collaboration Path (Emma -> Lukas Reddy)",
            "GET",
            "/api/analytics/collab-path?fromAuthorId=1&toAuthorId=60",
            200,
            None,
            None,
            lambda res: (
                res.get("hops") == 3
                and len(res.get("papers", [])) == 3,
                f"Exact {res.get('hops')} co-author hops verified",
            ),
        ),
        (
            "Within 2 Hops Reachability (Author 1)",
            "GET",
            "/api/analytics/within-hops?authorId=1&hops=2",
            200,
            None,
            None,
            lambda res: (
                res.get("totalReachable") == 15,
                f"Reachable authors: {res.get('totalReachable')}",
            ),
        ),
        (
            "Degree Centrality Ranking (Top 5 Authors)",
            "GET",
            "/api/analytics/central-authors?limit=5",
            200,
            None,
            None,
            lambda res: (
                len(res.get("authors", [])) == 5
                and res.get("authors", [])[0].get("distinctCoauthors", 0) >= 30,
                f"Top: {res.get('authors', [])[0].get('name')} (degree: {res.get('authors', [])[0].get('distinctCoauthors')})",
            ),
        ),
        (
            "Academic Institutions & Research Area Allocations",
            "GET",
            "/api/analytics/institutions?limit=5",
            200,
            None,
            None,
            lambda res: (
                len(res.get("researchAreas", [])) == 5
                and len(res.get("institutionPairs", [])) > 0,
                f"{len(res.get('researchAreas', []))} areas, top pair: {res.get('institutionPairs', [])[0].get('institution1')} & {res.get('institutionPairs', [])[0].get('institution2')}",
            ),
        ),
        (
            "Dataset Stats for Comparison (150 Authors, 110 Papers)",
            "GET",
            "/api/compare/stats?dataset=demo",
            200,
            None,
            None,
            lambda res: (
                res.get("neo4j", {}).get("authors") == 150
                and res.get("oracle", {}).get("authors") == 150
                and res.get("neo4j", {}).get("coauthorPairs") == 301,
                "Both engines verify 150 authors and 301 co-author pairs",
            ),
        ),
        (
            "Compare Scenario 1 (Direct Co-authors)",
            "GET",
            "/api/compare/coauthors?authorId=1",
            200,
            None,
            None,
            lambda res: (
                res.get("resultsMatch") is True
                and len(res.get("neo4j", {}).get("timings", [])) == 5
                and len(res.get("oracle", {}).get("timings", [])) == 5,
                f"Results match: True (Median: Oracle {res.get('oracle', {}).get('medianMs')}ms vs Neo4j {res.get('neo4j', {}).get('medianMs')}ms)",
            ),
        ),
        (
            "Compare Scenario 2 (Within 2 Hops)",
            "GET",
            "/api/compare/within-hops?authorId=1&hops=2",
            200,
            None,
            None,
            lambda res: (
                res.get("resultsMatch") is True
                and res.get("neo4j", {}).get("rowCount") == 15,
                f"Results match: True (15 reachable authors on both)",
            ),
        ),
        (
            "Compare Scenario 3 (Shortest Path 1 -> 60)",
            "GET",
            "/api/compare/shortest-path?fromAuthorId=1&toAuthorId=60",
            200,
            None,
            None,
            lambda res: (
                res.get("resultsMatch") is True,
                f"Results match: True (Median: Oracle {res.get('oracle', {}).get('medianMs')}ms vs Neo4j {res.get('neo4j', {}).get('medianMs')}ms)",
            ),
        ),
        (
            "Compare Scenario 4 (Conflict Check: 26 Blocked Pairs)",
            "GET",
            "/api/compare/conflict-check",
            200,
            None,
            None,
            lambda res: (
                res.get("resultsMatch") is True
                and res.get("neo4j", {}).get("rowCount") == 26,
                f"Results match: True (26 blocked pairs on both engines)",
            ),
        ),
        (
            "Compare Scenario 5 (Average Score: 110 Papers)",
            "GET",
            "/api/compare/avg-score",
            200,
            None,
            None,
            lambda res: (
                res.get("resultsMatch") is True
                and res.get("neo4j", {}).get("rowCount") == 110,
                f"Results match: True (110 paper scores on both engines)",
            ),
        ),
        (
            "Compare Dataset Status Endpoint (Demo & Scale Readiness)",
            "GET",
            "/api/compare/dataset-status",
            200,
            None,
            None,
            lambda res: (
                res.get("demo", {}).get("available") is True
                and "scale" in res,
                f"Demo available: True, Scale available: {res.get('scale', {}).get('available')}",
            ),
        ),
        (
            "Compare Scale Protection (Rejects Unseeded Scale)",
            "GET",
            "/api/compare/stats?dataset=scale",
            400,
            None,
            None,
            lambda res: (
                "scale" in res.get("detail", "").lower(),
                "Correctly rejected with HTTP 400 and clear seeder guidance",
            ),
        ),
        (
            "Admin Token Protection (Rejects Reset Without Token)",
            "POST",
            "/api/admin/reset-neo4j",
            403,
            {"confirm": True},
            None,
            lambda res: (
                "token" in res.get("detail", "").lower(),
                "Correctly rejected with HTTP 403 Forbidden",
            ),
        ),
    ]

    passed_count = 0
    total_count = len(tests)

    for i, test in enumerate(tests, 1):
        name, method, path, exp_status, body, headers, validator = test
        ok = run_test(
            num=i,
            name=name,
            method=method,
            path=path,
            expected_status=exp_status,
            body=body,
            headers=headers,
            validator=validator,
        )
        if ok:
            passed_count += 1

    print(f"\n{BOLD}{CYAN}================================================================={RESET}")
    if passed_count == total_count:
        print(f"  {GREEN}{BOLD}ALL {passed_count}/{total_count} SMOKE TESTS PASSED!{RESET}")
        print(f"  System is healthy and ready for demonstration.")
        print(f"{BOLD}{CYAN}================================================================={RESET}\n")
        sys.exit(0)
    else:
        failed_count = total_count - passed_count
        print(f"  {RED}{BOLD}{failed_count}/{total_count} SMOKE TESTS FAILED!{RESET}")
        print(f"  Please review the failures listed above.")
        print(f"{BOLD}{CYAN}================================================================={RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
