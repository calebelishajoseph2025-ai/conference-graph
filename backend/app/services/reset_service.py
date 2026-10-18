import csv
import logging
import threading
import time
from pathlib import Path
from typing import Any, Dict, List
from app.config import settings
from app.db_neo4j import get_driver

logger = logging.getLogger("backend.reset")

# Concurrency lock to prevent multiple resets from running at the same time (B2)
_reset_lock = threading.Lock()

# Fixed list of CSV filenames inside DATA_DIR that are permitted to be read
ALLOWED_CSV_FILES = {
    "conference": "conference.csv",
    "track": "track.csv",
    "session": "session_tbl.csv",
    "author": "author.csv",
    "reviewer": "reviewer.csv",
    "keyword": "keyword.csv",
    "paper": "paper.csv",
    "paper_author": "paper_author.csv",
    "paper_keyword": "paper_keyword.csv",
    "submission": "submission.csv",
    "paper_reviewer": "paper_reviewer.csv",
    "review": "review.csv",
    "presentation": "presentation.csv",
    "presentation_paper": "da3_presentation_paper.csv",
}

CONSTRAINTS = [
    "CREATE CONSTRAINT author_id IF NOT EXISTS FOR (n:Author) REQUIRE n.authorId IS UNIQUE",
    "CREATE CONSTRAINT reviewer_id IF NOT EXISTS FOR (n:Reviewer) REQUIRE n.reviewerId IS UNIQUE",
    "CREATE CONSTRAINT paper_id IF NOT EXISTS FOR (n:Paper) REQUIRE n.paperId IS UNIQUE",
    "CREATE CONSTRAINT conf_id IF NOT EXISTS FOR (n:Conference) REQUIRE n.confId IS UNIQUE",
    "CREATE CONSTRAINT track_id IF NOT EXISTS FOR (n:Track) REQUIRE n.trackId IS UNIQUE",
    "CREATE CONSTRAINT session_id IF NOT EXISTS FOR (n:Session) REQUIRE n.sessionId IS UNIQUE",
    "CREATE CONSTRAINT keyword_id IF NOT EXISTS FOR (n:Keyword) REQUIRE n.keywordId IS UNIQUE",
    "CREATE CONSTRAINT pres_id IF NOT EXISTS FOR (n:Presentation) REQUIRE n.presentationId IS UNIQUE",
    "CREATE CONSTRAINT author_email IF NOT EXISTS FOR (n:Author) REQUIRE n.email IS UNIQUE",
    "CREATE CONSTRAINT reviewer_email IF NOT EXISTS FOR (n:Reviewer) REQUIRE n.email IS UNIQUE",
    "CREATE CONSTRAINT keyword_keyword IF NOT EXISTS FOR (n:Keyword) REQUIRE n.keyword IS UNIQUE",
]

INDEXES = [
    "CREATE INDEX paper_status IF NOT EXISTS FOR (n:Paper) ON (n.status)",
    "CREATE INDEX paper_title IF NOT EXISTS FOR (n:Paper) ON (n.title)",
    "CREATE INDEX author_name IF NOT EXISTS FOR (n:Author) ON (n.name)",
    "CREATE INDEX reviewer_name IF NOT EXISTS FOR (n:Reviewer) ON (n.name)",
]


def _read_csv(filename: str) -> List[Dict[str, str]]:
    """
    Safely reads a CSV file ensuring the path resolves strictly inside DATA_DIR (B25: Path.is_relative_to).
    """
    data_dir_resolved = settings.DATA_DIR.resolve()
    file_path = (settings.DATA_DIR / filename).resolve()
    # Path traversal protection: ensure file_path is strictly within DATA_DIR
    if not file_path.is_relative_to(data_dir_resolved):
        raise ValueError(f"Path traversal detected: {filename}")
    if not file_path.is_file():
        raise FileNotFoundError(f"Required data file missing: {file_path}")

    with open(file_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


def _chunk_list(items: List[Any], chunk_size: int = 500):
    for i in range(0, len(items), chunk_size):
        yield items[i : i + chunk_size]


def reset_neo4j_database(database: str = None) -> Dict[str, Any]:
    """
    Wipes the Neo4j graph and reloads it from CSVs in DATA_DIR using parameterised UNWIND batches.
    Guarantees that all CSVs are validated in memory before any wipe is executed (B2).
    Enforces atomic thread safety via a module lock.
    """
    if not _reset_lock.acquire(blocking=False):
        raise RuntimeError("A database reset is already in progress. Please wait for it to complete.")

    try:
        db_name = database or settings.NEO4J_DATABASE
        driver = get_driver()
        start_total = time.perf_counter()

        logger.info("Pre-reading and validating all CSV files before database modifications...")

        # 1. Pre-read and validate ALL CSV files into memory FIRST (B2)
        conf_rows = [
            {
                "confId": int(r["ConfID"]),
                "name": r["Name"],
                "year": int(r["Year"]),
                "startDate": r["StartDate"],
                "endDate": r["EndDate"],
                "venue": r["Venue"],
            }
            for r in _read_csv(ALLOWED_CSV_FILES["conference"])
        ]

        track_rows = [
            {
                "trackId": int(r["TrackID"]),
                "name": r["TrackName"],
                "description": r["Description"],
                "confId": int(r["ConfID"]),
            }
            for r in _read_csv(ALLOWED_CSV_FILES["track"])
        ]

        session_rows = [
            {
                "sessionId": int(r["SessionID"]),
                "name": r["SessionName"],
                "date": r["SessionDate"],
                "startTime": r["StartTime"],
                "endTime": r["EndTime"],
                "room": r["Room"],
                "confId": int(r["ConfID"]),
            }
            for r in _read_csv(ALLOWED_CSV_FILES["session"])
        ]

        author_rows = [
            {
                "authorId": int(r["AuthorID"]),
                "name": r["Name"],
                "affiliation": r["Affiliation"],
                "email": r["Email"],
                "country": r["Country"],
            }
            for r in _read_csv(ALLOWED_CSV_FILES["author"])
        ]

        reviewer_rows = [
            {
                "reviewerId": int(r["ReviewerID"]),
                "name": r["Name"],
                "affiliation": r["Affiliation"],
                "email": r["Email"],
                "expertise": r["Expertise"],
                "country": r["Country"],
            }
            for r in _read_csv(ALLOWED_CSV_FILES["reviewer"])
        ]

        keyword_rows = [
            {"keywordId": int(r["KeywordID"]), "keyword": r["Keyword"]}
            for r in _read_csv(ALLOWED_CSV_FILES["keyword"])
        ]

        paper_rows = [
            {
                "paperId": int(r["PaperID"]),
                "title": r["Title"],
                "abstract": r["Abstract"],
                "status": r["Status"],
                "submissionDate": r["SubmissionDate"],
                "confId": int(r["ConfID"]),
                "trackId": int(r["TrackID"]),
            }
            for r in _read_csv(ALLOWED_CSV_FILES["paper"])
        ]

        paper_author_rows = [
            {
                "paperId": int(r["PaperID"]),
                "authorId": int(r["AuthorID"]),
                "authorOrder": int(r["AuthorOrder"]),
                "isCorresponding": r["IsCorresponding"] in ("1", "True", "true", "Y"),
            }
            for r in _read_csv(ALLOWED_CSV_FILES["paper_author"])
        ]

        submission_rows = [
            {
                "submissionId": int(r["SubmissionID"]),
                "paperId": int(r["PaperID"]),
                "submittedBy": int(r["SubmittedBy"]),
                "submissionDate": r["SubmissionDate"],
                "status": r["Status"],
                "source": r["Source"],
            }
            for r in _read_csv(ALLOWED_CSV_FILES["submission"])
        ]

        paper_keyword_rows = [
            {"paperId": int(r["PaperID"]), "keywordId": int(r["KeywordID"])}
            for r in _read_csv(ALLOWED_CSV_FILES["paper_keyword"])
        ]

        paper_reviewer_rows = [
            {
                "paperId": int(r["PaperID"]),
                "reviewerId": int(r["ReviewerID"]),
                "assignedDate": r["AssignedDate"],
            }
            for r in _read_csv(ALLOWED_CSV_FILES["paper_reviewer"])
        ]

        review_rows = [
            {
                "reviewId": int(r["ReviewID"]),
                "paperId": int(r["PaperID"]),
                "reviewerId": int(r["ReviewerID"]),
                "score": int(r["Score"]),
                "comments": r["Comments"],
                "reviewDate": r["ReviewDate"],
                "recommendation": r["Recommendation"],
            }
            for r in _read_csv(ALLOWED_CSV_FILES["review"])
        ]

        pres_rows = [
            {
                "presentationId": int(r["PresentationID"]),
                "sessionId": int(r["SessionID"]),
                "startTime": r["StartTime"],
                "endTime": r["EndTime"],
                "deliveryMode": r["DeliveryMode"],
            }
            for r in _read_csv(ALLOWED_CSV_FILES["presentation"])
        ]

        pres_paper_rows = [
            {"presentationId": int(r["PresentationID"]), "paperId": int(r["PaperID"])}
            for r in _read_csv(ALLOWED_CSV_FILES["presentation_paper"])
        ]

        logger.info("All CSV data validated successfully in memory. Starting Neo4j transaction...")

        with driver.session(database=db_name) as session:
            # Step 1: Wipe all nodes and relationships
            logger.info("Wiping existing graph...")
            session.run("MATCH (n) DETACH DELETE n").consume()

            # Step 2: Ensure constraints and indexes
            logger.info("Creating constraints and indexes...")
            for c in CONSTRAINTS:
                session.run(c).consume()
            for idx in INDEXES:
                session.run(idx).consume()

            # Step 3: Load Conferences
            session.run(
                """
                UNWIND $rows AS r
                CREATE (:Conference {
                    confId: r.confId,
                    name: r.name,
                    year: r.year,
                    startDate: date(r.startDate),
                    endDate: date(r.endDate),
                    venue: r.venue
                })
                """,
                {"rows": conf_rows},
            ).consume()

            # Step 4: Load Tracks
            session.run(
                """
                UNWIND $rows AS r
                MATCH (c:Conference {confId: r.confId})
                CREATE (t:Track {
                    trackId: r.trackId,
                    name: r.name,
                    description: r.description
                })-[:PART_OF]->(c)
                """,
                {"rows": track_rows},
            ).consume()

            # Step 5: Load Sessions
            session.run(
                """
                UNWIND $rows AS r
                MATCH (c:Conference {confId: r.confId})
                CREATE (s:Session {
                    sessionId: r.sessionId,
                    name: r.name,
                    date: date(r.date),
                    startTime: r.startTime,
                    endTime: r.endTime,
                    room: r.room
                })-[:SCHEDULED_AT]->(c)
                """,
                {"rows": session_rows},
            ).consume()

            # Step 6: Load Authors
            for batch in _chunk_list(author_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    CREATE (:Author {
                        authorId: r.authorId,
                        name: r.name,
                        affiliation: r.affiliation,
                        email: r.email,
                        country: r.country
                    })
                    """,
                    {"rows": batch},
                ).consume()

            # Step 7: Load Reviewers
            for batch in _chunk_list(reviewer_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    CREATE (:Reviewer {
                        reviewerId: r.reviewerId,
                        name: r.name,
                        affiliation: r.affiliation,
                        email: r.email,
                        expertise: r.expertise,
                        country: r.country
                    })
                    """,
                    {"rows": batch},
                ).consume()

            # Step 8: Load Keywords
            for batch in _chunk_list(keyword_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    CREATE (:Keyword {
                        keywordId: r.keywordId,
                        keyword: r.keyword
                    })
                    """,
                    {"rows": batch},
                ).consume()

            # Step 9: Load Papers (with SUBMITTED_TO and IN_TRACK)
            for batch in _chunk_list(paper_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (c:Conference {confId: r.confId})
                    MATCH (t:Track {trackId: r.trackId})
                    CREATE (p:Paper {
                        paperId: r.paperId,
                        title: r.title,
                        abstract: r.abstract,
                        status: r.status,
                        submissionDate: date(r.submissionDate)
                    })
                    CREATE (p)-[:SUBMITTED_TO]->(c)
                    CREATE (p)-[:IN_TRACK]->(t)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 10: Load Paper-Author (WROTE)
            for batch in _chunk_list(paper_author_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (a:Author {authorId: r.authorId}), (p:Paper {paperId: r.paperId})
                    CREATE (a)-[:WROTE {
                        authorOrder: r.authorOrder,
                        isCorresponding: r.isCorresponding
                    }]->(p)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 11: Load Submissions (SUBMITTED)
            for batch in _chunk_list(submission_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (a:Author {authorId: r.submittedBy}), (p:Paper {paperId: r.paperId})
                    CREATE (a)-[:SUBMITTED {
                        submissionId: r.submissionId,
                        date: date(r.submissionDate),
                        source: r.source,
                        status: r.status
                    }]->(p)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 12: Load Paper-Keyword (HAS_KEYWORD)
            for batch in _chunk_list(paper_keyword_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (p:Paper {paperId: r.paperId}), (k:Keyword {keywordId: r.keywordId})
                    CREATE (p)-[:HAS_KEYWORD]->(k)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 13: Load Reviewer Assignments (ASSIGNED_TO)
            for batch in _chunk_list(paper_reviewer_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (rv:Reviewer {reviewerId: r.reviewerId}), (p:Paper {paperId: r.paperId})
                    CREATE (rv)-[:ASSIGNED_TO {
                        assignedDate: date(r.assignedDate)
                    }]->(p)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 14: Load Reviews (REVIEWED)
            for batch in _chunk_list(review_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (rv:Reviewer {reviewerId: r.reviewerId}), (p:Paper {paperId: r.paperId})
                    CREATE (rv)-[:REVIEWED {
                        reviewId: r.reviewId,
                        score: r.score,
                        comments: r.comments,
                        recommendation: r.recommendation,
                        reviewDate: date(r.reviewDate)
                    }]->(p)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 15: Load Presentations (HELD_IN)
            for batch in _chunk_list(pres_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (s:Session {sessionId: r.sessionId})
                    CREATE (pr:Presentation {
                        presentationId: r.presentationId,
                        startTime: r.startTime,
                        endTime: r.endTime,
                        deliveryMode: r.deliveryMode
                    })-[:HELD_IN]->(s)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 16: Load Presentation-Paper (PRESENTS)
            for batch in _chunk_list(pres_paper_rows, 500):
                session.run(
                    """
                    UNWIND $rows AS r
                    MATCH (pr:Presentation {presentationId: r.presentationId}), (p:Paper {paperId: r.paperId})
                    CREATE (pr)-[:PRESENTS]->(p)
                    """,
                    {"rows": batch},
                ).consume()

            # Step 17: Create SAME_PERSON_AS edges last
            logger.info("Creating SAME_PERSON_AS edges...")
            session.run(
                """
                MATCH (rv:Reviewer), (a:Author)
                WHERE rv.email = a.email
                CREATE (rv)-[:SAME_PERSON_AS]->(a)
                """
            ).consume()

            # Verification counts
            nodes = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
            rels = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
            same_person = session.run("MATCH ()-[r:SAME_PERSON_AS]->() RETURN count(r) AS c").single()["c"]

        elapsed_ms = (time.perf_counter() - start_total) * 1000.0
        logger.info("Neo4j reset finished in %.2f ms. Nodes: %d, Relationships: %d, SAME_PERSON_AS: %d",
                    elapsed_ms, nodes, rels, same_person)

        return {
            "status": "success",
            "database": db_name,
            "nodes": nodes,
            "relationships": rels,
            "same_person_as": same_person,
            "elapsed_ms": round(elapsed_ms, 2),
        }
    finally:
        _reset_lock.release()
