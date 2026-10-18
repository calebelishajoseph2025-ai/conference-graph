#!/usr/bin/env python3
"""
Conference Graph Explorer — Synthetic Scale Seeder
Generates a large synthetic academic conference dataset (default: 20,000 authors, 40,000 papers)
into dedicated scale targets:
  - Neo4j database: NEO4J_SCALE_DATABASE (e.g. 'scale')
  - Oracle user:    ORACLE_SCALE_USER (e.g. 'academic_scale')

Safety:
  - Requires --confirm flag.
  - Refuses to run if scale targets equal demo targets.
  - Only ever clears and populates the scale database targets.
"""

import sys
import os
import time
import random
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple

# Ensure project root is on PYTHONPATH
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.config import settings
from app.db_neo4j import get_driver

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("scale_seed")

FIRST_NAMES = [
    "Emma", "Liam", "Olivia", "Noah", "Sophia", "Lucas", "Ava", "Mason", "Isabella", "Ethan",
    "Mia", "Oliver", "Amelia", "Elijah", "Harper", "Aiden", "Evelyn", "James", "Abigail", "Benjamin",
    "Yuki", "Carlos", "Priya", "Chen", "Fatima", "Suresh", "Elena", "Dmitri", "Amina", "Lukas",
    "Chloe", "Arjun", "Zara", "Mateo", "Ananya", "Lars", "Mei", "Kavita", "Tariq", "Hanna",
    "Rahul", "Astrid", "David", "Pierre", "Wei", "Ingrid", "Sven", "Fatou", "Hiroshi", "Camila"
]

LAST_NAMES = [
    "Krishnan", "Tanaka", "Mendoza", "Schmidt", "Kim", "Patel", "Dubois", "Ivanov", "Ndiaye", "Reddy",
    "Bennett", "Liu", "Larsson", "Rossi", "Silva", "Kowalski", "O'Connor", "Hansen", "Nair", "Al-Mansoor",
    "Zhang", "Singh", "Das", "Alvarez", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
    "Gomez", "Santos", "Reyes", "Morales", "Ortiz", "Gutierrez", "Chavez", "Ramos", "Vargas", "Castillo"
]

AFFILIATIONS = [
    ("MIT", "USA"),
    ("Stanford University", "USA"),
    ("UC Berkeley", "USA"),
    ("Carnegie Mellon University", "USA"),
    ("Oxford University", "UK"),
    ("Cambridge University", "UK"),
    ("Imperial College London", "UK"),
    ("ETH Zurich", "Switzerland"),
    ("EPFL", "Switzerland"),
    ("TU Munich", "Germany"),
    ("University of Tokyo", "Japan"),
    ("Kyoto University", "Japan"),
    ("National University of Singapore", "Singapore"),
    ("Tsinghua University", "China"),
    ("Peking University", "China"),
    ("IIT Bombay", "India"),
    ("IIT Delhi", "India"),
    ("University of Toronto", "Canada"),
    ("McGill University", "Canada"),
    ("INRIA", "France"),
]

CONFERENCES = [
    (1, "SIGMOD 2026", 2026, "2026-06-15", "2026-06-20", "Berlin, Germany"),
    (2, "VLDB 2026", 2026, "2026-08-24", "2026-08-28", "Boston, USA"),
    (3, "ICDE 2026", 2026, "2026-04-12", "2026-04-16", "Kyoto, Japan"),
    (4, "EDBT 2026", 2026, "2026-03-23", "2026-03-27", "Edinburgh, UK"),
    (5, "KDD 2026", 2026, "2026-08-09", "2026-08-13", "Toronto, Canada"),
]

TRACKS = [
    (1, "Core Database Systems", "Storage, transactions, and indexing", 1),
    (2, "Graph Data Management", "Property graphs, graph algorithms, and RDF", 1),
    (3, "Distributed & Cloud Systems", "Replication, consensus, and elastic scaling", 1),
    (4, "AI & Database Integration", "Vector search, in-database inference, and RAG", 1),
    (5, "Query Optimization", "Cost models, learned optimizers, and adaptive execution", 2),
    (6, "Scalable Data Analytics", "OLAP, stream processing, and lakehouses", 2),
    (7, "Data Quality & Integration", "Entity matching, cleaning, and provenance", 2),
    (8, "Security & Privacy", "Differential privacy, encryption, and access control", 2),
    (9, "Data Mining & Knowledge Graphs", "Graph embeddings, entity resolution, and discovery", 3),
    (10, "Semi-Structured & Text Data", "JSON, document stores, and hybrid retrieval", 3),
    (11, "Hardware-Accelerated Databases", "GPU query engines, NVMe, and CXL memory", 3),
    (12, "Benchmarks & Evaluation", "Experimental reproducibility and evaluation", 4),
    (13, "Data Visualization & Exploration", "Interactive analytics and visual interfaces", 4),
    (14, "Applied Machine Learning", "ML systems, model governance, and pipelines", 5),
    (15, "Deep Learning Architectures", "Transformers, attention, and representation", 5),
    (16, "Recommender Systems", "Collaborative filtering, embeddings, and ranking", 5),
    (17, "Fairness & Explainability", "Ethical AI, interpretability, and bias mitigation", 5),
]

KEYWORDS = [
    (1, "Relational Databases"), (2, "Graph Databases"), (3, "Query Optimization"),
    (4, "Indexing"), (5, "Vector Search"), (6, "Distributed Systems"),
    (7, "Cloud Computing"), (8, "Transactions"), (9, "Concurrency Control"),
    (10, "Data Analytics"), (11, "Machine Learning"), (12, "Deep Learning"),
    (13, "Natural Language Processing"), (14, "Knowledge Graphs"), (15, "Data Integration"),
    (16, "Dataform"), (17, "Stream Processing"), (18, "Hardware Acceleration"),
    (19, "Security & Privacy"), (20, "Differential Privacy"), (21, "Recommender Systems"),
    (22, "Entity Matching"), (23, "Graph Algorithms"), (24, "Lakehouse Architecture"),
    (25, "In-Memory Databases"), (26, "Learned Index Structures"), (27, "Embeddings"),
    (28, "Data Quality"),
]

PAPER_TOPIC_PREFIXES = [
    "Scaling", "High-Performance", "Efficient", "Provably Optimal", "Learned",
    "Distributed", "Adaptive", "Robust", "Autonomous", "Asynchronous",
    "Benchmarking", "Fast", "Secure", "Memory-Efficient", "Fault-Tolerant"
]

PAPER_TOPIC_MIDDLES = [
    "Vector Search and Indexing", "Graph Neural Network Traversal", "Recursive CTE Execution",
    "Transaction Processing in Cloud Datastores", "Query Optimization for Heterogeneous Workloads",
    "In-Memory Graph Pattern Matching", "Differential Privacy in Collaborative Data Analytics",
    "Approximate Nearest Neighbour Retrieval", "Hardware-Accelerated Join Processing",
    "Knowledge Graph Completion", "Multi-Version Concurrency Control", "Entity Resolution at Scale"
]

PAPER_TOPIC_SUFFIXES = [
    "with Provable Guarantees", "in Modern Hardware Architectures", "for Enterprise Workloads",
    "Under Extreme Concurrency", "Using Learned Heuristics", "Across Federated Catalogs",
    "in Cloud-Native Environments", "A Comprehensive Experimental Study"
]


def generate_synthetic_data(num_authors: int, num_papers: int) -> Dict[str, Any]:
    """Generates a cohesive, realistic academic conference dataset."""
    rng = random.Random(42)
    logger.info("Generating synthetic data for %d authors and %d papers...", num_authors, num_papers)

    # 1. Authors
    authors = []
    used_emails = set()
    for i in range(1, num_authors + 1):
        fn = rng.choice(FIRST_NAMES)
        ln = rng.choice(LAST_NAMES)
        name = f"{fn} {ln}"
        affil, country = rng.choice(AFFILIATIONS)
        clean_fn = fn.lower().replace("'", "")
        clean_ln = ln.lower().replace("'", "")
        email = f"{clean_fn}.{clean_ln}{i}@scale.ac.edu"
        used_emails.add(email)
        authors.append({
            "authorId": i,
            "name": name,
            "affiliation": affil,
            "email": email,
            "country": country,
        })

    # 2. Reviewers (approx 4% of author count, with ~1% overlap creating SAME_PERSON_AS)
    num_reviewers = max(100, int(num_authors * 0.04))
    reviewers = []
    num_overlap = max(5, int(num_reviewers * 0.015))  # ~1.5% overlap
    overlap_author_indices = rng.sample(range(num_authors), num_overlap)

    for i in range(1, num_reviewers + 1):
        if i <= num_overlap:
            # Overlap reviewer: exact same person as an author
            target_author = authors[overlap_author_indices[i - 1]]
            name = f"Dr. {target_author['name']}"
            email = target_author["email"]
            affil = target_author["affiliation"]
            country = target_author["country"]
        else:
            fn = rng.choice(FIRST_NAMES)
            ln = rng.choice(LAST_NAMES)
            name = f"Prof. {fn} {ln}"
            affil, country = rng.choice(AFFILIATIONS)
            clean_fn = fn.lower().replace("'", "")
            clean_ln = ln.lower().replace("'", "")
            email = f"{clean_fn}.{clean_ln}.rev{i}@scale-reviewer.org"

        track_name = rng.choice(TRACKS)[1]
        reviewers.append({
            "reviewerId": i,
            "name": name,
            "affiliation": affil,
            "email": email,
            "expertise": track_name,
            "country": country,
        })

    # Map emails to authorId and reviewerId for instant conflict lookups
    author_by_email = {a["email"]: a["authorId"] for a in authors}
    reviewer_by_email = {r["email"]: r["reviewerId"] for r in reviewers}
    same_person_pairs = [
        (r["reviewerId"], author_by_email[r["email"]])
        for r in reviewers
        if r["email"] in author_by_email
    ]
    conflicting_author_set = {aid for _, aid in same_person_pairs}

    # 3. Create Research Clusters (Clusters of authors that regularly co-author papers)
    num_clusters = max(20, num_authors // 35)
    clusters = [[] for _ in range(num_clusters)]
    for a in authors:
        clusters[rng.randint(0, num_clusters - 1)].append(a["authorId"])

    # High-degree hub authors (10 prolific researchers)
    hub_authors = [authors[i]["authorId"] for i in range(min(15, num_authors))]

    # 4. Papers & Relationships
    papers = []
    paper_authors = []
    paper_keywords = []
    submissions = []
    statuses = ["Accepted", "Rejected", "Under Review", "Submitted"]
    status_weights = [0.45, 0.35, 0.15, 0.05]

    for pid in range(1, num_papers + 1):
        conf_id, _, _, _, _, _ = rng.choice(CONFERENCES)
        # Select track belonging to this conference
        avail_tracks = [t for t in TRACKS if t[3] == conf_id]
        track = rng.choice(avail_tracks) if avail_tracks else rng.choice(TRACKS)
        track_id = track[0]

        title = f"{rng.choice(PAPER_TOPIC_PREFIXES)} {rng.choice(PAPER_TOPIC_MIDDLES)} {rng.choice(PAPER_TOPIC_SUFFIXES)}"
        abstract = (
            f"This paper investigates novel techniques in {track[1]}. "
            f"We propose an optimized execution model designed for large-scale distributed and graph data architectures. "
            f"Extensive empirical evaluations demonstrate significant latency reductions and scalability improvements."
        )
        paper_status = rng.choices(statuses, weights=status_weights)[0]
        sub_date = f"2025-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}"

        papers.append({
            "paperId": pid,
            "title": title,
            "abstract": abstract,
            "confId": conf_id,
            "trackId": track_id,
            "status": paper_status,
            "submissionDate": sub_date,
        })

        # Pick co-authors: mostly from one cluster, occasionally include a hub author
        cluster = rng.choice(clusters)
        num_coauthors = rng.choices([1, 2, 3, 4, 5], weights=[0.20, 0.40, 0.25, 0.10, 0.05])[0]
        chosen_authors = []
        if cluster:
            chosen_authors = rng.sample(cluster, min(num_coauthors, len(cluster)))
        if rng.random() < 0.25 and hub_authors:
            hub = rng.choice(hub_authors)
            if hub not in chosen_authors:
                chosen_authors.append(hub)
        if not chosen_authors:
            chosen_authors = [rng.randint(1, num_authors)]

        for order, aid in enumerate(chosen_authors, 1):
            paper_authors.append({
                "paperId": pid,
                "authorId": aid,
                "authorOrder": order,
                "isCorresponding": (order == 1),
            })

        # Submission
        submissions.append({
            "submissionId": pid,
            "paperId": pid,
            "submittedBy": chosen_authors[0],
            "submissionDate": sub_date,
            "status": paper_status,
            "source": rng.choice(["Web Portal", "Direct API", "LaTeX Submitter"]),
        })

        # Keywords (2-4 keywords per paper)
        k_sample = rng.sample(KEYWORDS, rng.randint(2, 4))
        for k in k_sample:
            paper_keywords.append({
                "paperId": pid,
                "keywordId": k[0],
            })

    # 5. Reviewer Assignments & Reviews
    paper_reviewers = []
    reviews = []
    review_id_seq = 1

    # Map paper -> author IDs for conflict exclusion
    authors_by_paper = {}
    for pa in paper_authors:
        authors_by_paper.setdefault(pa["paperId"], set()).add(pa["authorId"])

    for p in papers:
        pid = p["paperId"]
        paper_author_ids = authors_by_paper.get(pid, set())
        # Conflicting reviewers: any reviewer who is also one of this paper's authors
        disallowed_reviewers = {
            rv_id for rv_id, aid in same_person_pairs if aid in paper_author_ids
        }

        # Available reviewers
        candidate_reviewers = [
            r["reviewerId"] for r in reviewers if r["reviewerId"] not in disallowed_reviewers
        ]
        if not candidate_reviewers:
            continue

        assigned_count = rng.randint(2, 3)
        assigned_sample = rng.sample(candidate_reviewers, min(assigned_count, len(candidate_reviewers)))

        for r_id in assigned_sample:
            assigned_date = p["submissionDate"]
            paper_reviewers.append({
                "paperId": pid,
                "reviewerId": r_id,
                "assignedDate": assigned_date,
            })

            # For Accepted / Rejected, all assignments are reviewed
            # For Under Review, ~50% are reviewed
            should_review = False
            if p["status"] in ("Accepted", "Rejected"):
                should_review = True
            elif p["status"] == "Under Review":
                should_review = (rng.random() < 0.5)

            if should_review:
                if p["status"] == "Accepted":
                    score = rng.randint(7, 10)
                    rec = "Accept"
                elif p["status"] == "Rejected":
                    score = rng.randint(1, 5)
                    rec = "Reject"
                else:
                    score = rng.randint(4, 8)
                    rec = rng.choice(["Accept", "Minor Revision", "Major Revision", "Reject"])

                reviews.append({
                    "reviewId": review_id_seq,
                    "paperId": pid,
                    "reviewerId": r_id,
                    "score": score,
                    "comments": f"Strong contribution to scalable {p['status'].lower()} systems.",
                    "reviewDate": assigned_date,
                    "recommendation": rec,
                })
                review_id_seq += 1

    return {
        "conferences": CONFERENCES,
        "tracks": TRACKS,
        "keywords": KEYWORDS,
        "authors": authors,
        "reviewers": reviewers,
        "papers": papers,
        "paper_authors": paper_authors,
        "paper_keywords": paper_keywords,
        "submissions": submissions,
        "paper_reviewers": paper_reviewers,
        "reviews": reviews,
        "same_person_pairs": same_person_pairs,
    }


def seed_neo4j_scale(data: Dict[str, Any]) -> None:
    """Seeds the Neo4j scale database via parameterized UNWIND batches."""
    scale_db = settings.NEO4J_SCALE_DATABASE
    driver = get_driver()
    logger.info("Initializing Neo4j scale database '%s'...", scale_db)

    # 1. Ensure scale database exists and is online
    with driver.session(database="system") as s:
        s.run(f"CREATE DATABASE {scale_db} IF NOT EXISTS").consume()

    # Wait for online
    time.sleep(1.0)
    for _ in range(10):
        with driver.session(database="system") as s:
            status = None
            for r in s.run("SHOW DATABASES"):
                if r.get("name") == scale_db:
                    status = r.get("currentStatus")
                    break
            if status == "online":
                logger.info("Neo4j database '%s' is ONLINE.", scale_db)
                break
        time.sleep(1.0)

    # 2. Clear existing scale data
    logger.info("Clearing existing data in '%s'...", scale_db)
    with driver.session(database=scale_db) as s:
        s.run("MATCH (n) DETACH DELETE n").consume()

    # 3. Create Constraints & Indexes
    logger.info("Creating constraints and indexes in '%s'...", scale_db)
    constraints = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Conference) REQUIRE c.confId IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Track) REQUIRE t.trackId IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Session) REQUIRE s.sessionId IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.authorId IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.email IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (rv:Reviewer) REQUIRE rv.reviewerId IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (rv:Reviewer) REQUIRE rv.email IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Paper) REQUIRE p.paperId IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (k:Keyword) REQUIRE k.keywordId IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (k:Keyword) REQUIRE k.keyword IS UNIQUE",
    ]
    indexes = [
        "CREATE INDEX IF NOT EXISTS FOR (p:Paper) ON (p.status)",
        "CREATE INDEX IF NOT EXISTS FOR (p:Paper) ON (p.title)",
        "CREATE INDEX IF NOT EXISTS FOR (a:Author) ON (a.name)",
        "CREATE INDEX IF NOT EXISTS FOR (rv:Reviewer) ON (rv.name)",
    ]
    with driver.session(database=scale_db) as s:
        for c in constraints:
            s.run(c).consume()
        for i in indexes:
            s.run(i).consume()

    # Helper for batch loading
    def batch_unwind(cypher_stmt: str, rows: List[Dict[str, Any]], batch_size: int = 2000):
        total = len(rows)
        for i in range(0, total, batch_size):
            chunk = rows[i:i + batch_size]
            with driver.session(database=scale_db) as session:
                session.run(cypher_stmt, {"rows": chunk}).consume()

    # 4. Load Nodes
    logger.info("Loading %d Conferences and %d Tracks...", len(data["conferences"]), len(data["tracks"]))
    conf_rows = [
        {"confId": c[0], "name": c[1], "year": c[2], "startDate": c[3], "endDate": c[4], "venue": c[5]}
        for c in data["conferences"]
    ]
    batch_unwind("UNWIND $rows AS r CREATE (c:Conference {confId: r.confId, name: r.name, year: r.year, startDate: date(r.startDate), endDate: date(r.endDate), venue: r.venue})", conf_rows)

    track_rows = [
        {"trackId": t[0], "name": t[1], "description": t[2], "confId": t[3]}
        for t in data["tracks"]
    ]
    batch_unwind("UNWIND $rows AS r MATCH (c:Conference {confId: r.confId}) CREATE (t:Track {trackId: r.trackId, name: r.name, description: r.description})-[:PART_OF]->(c)", track_rows)

    logger.info("Loading %d Keywords...", len(data["keywords"]))
    keyword_rows = [{"keywordId": k[0], "keyword": k[1]} for k in data["keywords"]]
    batch_unwind("UNWIND $rows AS r CREATE (k:Keyword {keywordId: r.keywordId, keyword: r.keyword})", keyword_rows)

    logger.info("Loading %d Authors in batches...", len(data["authors"]))
    batch_unwind("UNWIND $rows AS r CREATE (a:Author {authorId: r.authorId, name: r.name, affiliation: r.affiliation, email: r.email, country: r.country})", data["authors"])

    logger.info("Loading %d Reviewers in batches...", len(data["reviewers"]))
    batch_unwind("UNWIND $rows AS r CREATE (rv:Reviewer {reviewerId: r.reviewerId, name: r.name, affiliation: r.affiliation, email: r.email, expertise: r.expertise, country: r.country})", data["reviewers"])

    logger.info("Loading %d Papers in batches...", len(data["papers"]))
    batch_unwind(
        """UNWIND $rows AS r
           MATCH (c:Conference {confId: r.confId})
           MATCH (t:Track {trackId: r.trackId})
           CREATE (p:Paper {paperId: r.paperId, title: r.title, abstract: r.abstract, status: r.status, submissionDate: date(r.submissionDate)})
           CREATE (p)-[:SUBMITTED_TO]->(c)
           CREATE (p)-[:IN_TRACK]->(t)
        """, data["papers"], batch_size=1000
    )

    # 5. Load Relationships
    logger.info("Loading %d WROTE edges...", len(data["paper_authors"]))
    batch_unwind(
        """UNWIND $rows AS r
           MATCH (a:Author {authorId: r.authorId})
           MATCH (p:Paper {paperId: r.paperId})
           CREATE (a)-[:WROTE {authorOrder: r.authorOrder, isCorresponding: r.isCorresponding}]->(p)
        """, data["paper_authors"], batch_size=2500
    )

    logger.info("Loading %d SUBMITTED edges...", len(data["submissions"]))
    batch_unwind(
        """UNWIND $rows AS r
           MATCH (a:Author {authorId: r.submittedBy})
           MATCH (p:Paper {paperId: r.paperId})
           CREATE (a)-[:SUBMITTED {submissionId: r.submissionId, date: date(r.submissionDate), status: r.status, source: r.source}]->(p)
        """, data["submissions"], batch_size=2500
    )

    logger.info("Loading %d HAS_KEYWORD edges...", len(data["paper_keywords"]))
    batch_unwind(
        """UNWIND $rows AS r
           MATCH (p:Paper {paperId: r.paperId})
           MATCH (k:Keyword {keywordId: r.keywordId})
           CREATE (p)-[:HAS_KEYWORD]->(k)
        """, data["paper_keywords"], batch_size=2500
    )

    logger.info("Loading %d ASSIGNED_TO edges...", len(data["paper_reviewers"]))
    batch_unwind(
        """UNWIND $rows AS r
           MATCH (rv:Reviewer {reviewerId: r.reviewerId})
           MATCH (p:Paper {paperId: r.paperId})
           CREATE (rv)-[:ASSIGNED_TO {assignedDate: date(r.assignedDate)}]->(p)
        """, data["paper_reviewers"], batch_size=2500
    )

    logger.info("Loading %d REVIEWED edges...", len(data["reviews"]))
    batch_unwind(
        """UNWIND $rows AS r
           MATCH (rv:Reviewer {reviewerId: r.reviewerId})
           MATCH (p:Paper {paperId: r.paperId})
           CREATE (rv)-[:REVIEWED {reviewId: r.reviewId, score: r.score, comments: r.comments, reviewDate: date(r.reviewDate), recommendation: r.recommendation}]->(p)
        """, data["reviews"], batch_size=2500
    )

    logger.info("Creating SAME_PERSON_AS edges where emails match...")
    with driver.session(database=scale_db) as s:
        res = s.run(
            """MATCH (rv:Reviewer)
               MATCH (a:Author)
               WHERE toLower(rv.email) = toLower(a.email)
               CREATE (rv)-[:SAME_PERSON_AS]->(a)
               RETURN count(*) AS cnt
            """
        ).single()
        same_person_cnt = res["cnt"] if res else 0
        logger.info("Created %d SAME_PERSON_AS identity relationships.", same_person_cnt)

    # Verification
    with driver.session(database=scale_db) as s:
        node_cnt = s.run("MATCH (n) RETURN count(n) AS c").single()["c"]
        rel_cnt = s.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
        logger.info("Neo4j scale load complete: %d nodes, %d relationships.", node_cnt, rel_cnt)


def seed_oracle_scale(data: Dict[str, Any]) -> None:
    """Seeds the Oracle scale database via executemany batches with triggers temporarily disabled."""
    import oracledb

    scale_user = settings.ORACLE_SCALE_USER
    scale_pwd = settings.ORACLE_SCALE_PASSWORD
    scale_dsn = settings.ORACLE_DSN

    logger.info("Connecting to Oracle scale user '%s' at %s...", scale_user, scale_dsn)
    try:
        conn = oracledb.connect(user=scale_user, password=scale_pwd, dsn=scale_dsn)
    except oracledb.Error as e:
        logger.warning(
            "Could not connect to Oracle user '%s': %s.\n"
            "Skipping Oracle scale loading. To enable Oracle scale benchmarks, execute:\n"
            "  1. sqlplus system@localhost:1521/FREEPDB1 @data/oracle_setup/02_create_scale_user.sql\n"
            "  2. sqlplus academic_scale/ScalePass_2026@localhost:1521/FREEPDB1 @data/oracle_setup/01_schema.sql\n"
            "Then re-run: python scripts/scale_seed.py --confirm",
            scale_user, str(e)
        )
        return

    cursor = conn.cursor()
    try:
        # Disable triggers during scale load
        logger.info("Disabling validation triggers during bulk load...")
        try:
            cursor.execute("ALTER TRIGGER trg_no_self_review DISABLE")
            cursor.execute("ALTER TRIGGER trg_flag_paper DISABLE")
        except Exception as e:
            logger.info("Notice when disabling triggers: %s", e)

        # Clear existing tables in reverse dependency order
        logger.info("Clearing existing records in Oracle scale user '%s'...", scale_user)
        for tbl in ["REVIEW", "PAPER_REVIEWER", "PAPER_KEYWORD", "PAPER_AUTHOR", "SUBMISSION", "PRESENTATION", "PAPER", "SESSION_TBL", "TRACK", "KEYWORD", "REVIEWER", "AUTHOR", "CONFERENCE"]:
            try:
                cursor.execute(f"DELETE FROM {tbl}")
            except Exception:
                pass
        conn.commit()

        # Batch inserts
        logger.info("Inserting %d Conferences and %d Tracks...", len(data["conferences"]), len(data["tracks"]))
        cursor.executemany(
            "INSERT INTO CONFERENCE (ConfID, Name, Year, StartDate, EndDate, Venue) VALUES (:1, :2, :3, TO_DATE(:4, 'YYYY-MM-DD'), TO_DATE(:5, 'YYYY-MM-DD'), :6)",
            data["conferences"]
        )
        cursor.executemany(
            "INSERT INTO TRACK (TrackID, TrackName, Description, ConfID) VALUES (:1, :2, :3, :4)",
            data["tracks"]
        )

        logger.info("Inserting %d Keywords...", len(data["keywords"]))
        cursor.executemany(
            "INSERT INTO KEYWORD (KeywordID, Keyword) VALUES (:1, :2)",
            data["keywords"]
        )

        logger.info("Inserting %d Authors in batches...", len(data["authors"]))
        author_tuples = [(a["authorId"], a["name"], a["affiliation"], a["email"], a["country"]) for a in data["authors"]]
        cursor.executemany("INSERT INTO AUTHOR (AuthorID, Name, Affiliation, Email, Country) VALUES (:1, :2, :3, :4, :5)", author_tuples)

        logger.info("Inserting %d Reviewers...", len(data["reviewers"]))
        reviewer_tuples = [(r["reviewerId"], r["name"], r["affiliation"], r["email"], r["expertise"], r["country"]) for r in data["reviewers"]]
        cursor.executemany("INSERT INTO REVIEWER (ReviewerID, Name, Affiliation, Email, Expertise, Country) VALUES (:1, :2, :3, :4, :5, :6)", reviewer_tuples)

        logger.info("Inserting %d Papers in batches...", len(data["papers"]))
        paper_tuples = [(p["paperId"], p["title"], p["abstract"], p["confId"], p["trackId"], p["status"], p["submissionDate"]) for p in data["papers"]]
        cursor.executemany("INSERT INTO PAPER (PaperID, Title, Abstract, ConfID, TrackID, Status, SubmissionDate) VALUES (:1, :2, :3, :4, :5, :6, TO_DATE(:7, 'YYYY-MM-DD'))", paper_tuples)

        logger.info("Inserting %d Paper-Author mappings...", len(data["paper_authors"]))
        pa_tuples = [(pa["paperId"], pa["authorId"], pa["authorOrder"], 'Y' if pa["isCorresponding"] else 'N') for pa in data["paper_authors"]]
        cursor.executemany("INSERT INTO PAPER_AUTHOR (PaperID, AuthorID, AuthorOrder, IsCorresponding) VALUES (:1, :2, :3, :4)", pa_tuples)

        logger.info("Inserting %d Submissions...", len(data["submissions"]))
        sub_tuples = [(s["submissionId"], s["paperId"], s["submittedBy"], s["submissionDate"], s["status"], s["source"]) for s in data["submissions"]]
        cursor.executemany("INSERT INTO SUBMISSION (SubmissionID, PaperID, SubmittedBy, SubmissionDate, Status, Source) VALUES (:1, :2, :3, TO_DATE(:4, 'YYYY-MM-DD'), :5, :6)", sub_tuples)

        logger.info("Inserting %d Paper-Keyword mappings...", len(data["paper_keywords"]))
        pk_tuples = [(pk["paperId"], pk["keywordId"]) for pk in data["paper_keywords"]]
        cursor.executemany("INSERT INTO PAPER_KEYWORD (PaperID, KeywordID) VALUES (:1, :2)", pk_tuples)

        logger.info("Inserting %d Paper-Reviewer assignments...", len(data["paper_reviewers"]))
        pr_tuples = [(pr["paperId"], pr["reviewerId"], pr["assignedDate"]) for pr in data["paper_reviewers"]]
        cursor.executemany("INSERT INTO PAPER_REVIEWER (PaperID, ReviewerID, AssignedDate) VALUES (:1, :2, TO_DATE(:3, 'YYYY-MM-DD'))", pr_tuples)

        logger.info("Inserting %d Reviews...", len(data["reviews"]))
        rev_tuples = [(r["reviewId"], r["paperId"], r["reviewerId"], r["score"], r["comments"], r["reviewDate"], r["recommendation"]) for r in data["reviews"]]
        cursor.executemany("INSERT INTO REVIEW (ReviewID, PaperID, ReviewerID, Score, Comments, ReviewDate, Recommendation) VALUES (:1, :2, :3, :4, :5, TO_DATE(:6, 'YYYY-MM-DD'), :7)", rev_tuples)

        conn.commit()
        logger.info("Oracle scale loading committed successfully.")

    finally:
        # Re-enable triggers guaranteed in finally block
        logger.info("Re-enabling validation triggers...")
        try:
            cursor.execute("ALTER TRIGGER trg_no_self_review ENABLE")
            cursor.execute("ALTER TRIGGER trg_flag_paper ENABLE")
        except Exception as e:
            logger.info("Notice when re-enabling triggers: %s", e)
        cursor.close()
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Conference Graph Explorer Scale Data Seeder")
    parser.add_argument("--authors", type=int, default=20000, help="Number of authors to generate (default: 20000)")
    parser.add_argument("--papers", type=int, default=40000, help="Number of papers to generate (default: 40000)")
    parser.add_argument("--confirm", action="store_true", help="Must be supplied to confirm execution")
    parser.add_argument("--skip-oracle", action="store_true", help="Skip Oracle loading (Neo4j only)")
    parser.add_argument("--skip-neo4j", action="store_true", help="Skip Neo4j loading (Oracle only)")

    args = parser.parse_args()

    if not args.confirm:
        print("\n[ERROR] Missing confirmation flag!")
        print("To seed scale targets, you must explicitly provide --confirm:")
        print("  python scripts/scale_seed.py --confirm [--authors 20000] [--papers 40000]\n")
        sys.exit(1)

    # Safety checks
    if settings.NEO4J_SCALE_DATABASE == settings.NEO4J_DATABASE:
        print(f"[FATAL SAFETY CHECK] NEO4J_SCALE_DATABASE equals primary NEO4J_DATABASE ('{settings.NEO4J_DATABASE}'). Aborting to protect demo data!")
        sys.exit(1)

    if settings.ORACLE_SCALE_USER == settings.ORACLE_USER:
        print(f"[FATAL SAFETY CHECK] ORACLE_SCALE_USER equals primary ORACLE_USER ('{settings.ORACLE_USER}'). Aborting to protect demo data!")
        sys.exit(1)

    t0 = time.perf_counter()
    print("=================================================================")
    print("  Conference Graph Explorer — Synthetic Scale Seeding Pipeline")
    print(f"  Target Neo4j Database: {settings.NEO4J_SCALE_DATABASE}")
    print(f"  Target Oracle User:    {settings.ORACLE_SCALE_USER}")
    print(f"  Target Volume:         {args.authors:,} authors · {args.papers:,} papers")
    print("=================================================================\n")

    # Generate dataset
    data = generate_synthetic_data(args.authors, args.papers)

    # 1. Seed Neo4j Scale Database
    if not args.skip_neo4j:
        seed_neo4j_scale(data)

    # 2. Seed Oracle Scale User
    if not args.skip_oracle:
        seed_oracle_scale(data)

    elapsed = time.perf_counter() - t0
    print("\n=================================================================")
    print(f"  [SUCCESS] Scale dataset seeding completed in {elapsed:.2f} seconds!")
    print(f"  Authors: {len(data['authors']):,} | Papers: {len(data['papers']):,} | Reviews: {len(data['reviews']):,}")
    print("=================================================================\n")


if __name__ == "__main__":
    main()
