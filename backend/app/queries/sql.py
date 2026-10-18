"""
SQL query definitions and templates for Oracle database.
Parameterized bindings (:param) strictly enforced for all queries.
"""

SELECT_TABLE_COUNT = "SELECT COUNT(*) FROM {table}"

# --- Phase 5: Comparison Scenarios ---

# 1. Co-authors of an author (1 hop)
SQL_COAUTHORS = """
SELECT DISTINCT pa2.AuthorID AS id, a2.Name AS name, COUNT(DISTINCT pa1.PaperID) AS shared_papers
FROM PAPER_AUTHOR pa1
JOIN PAPER_AUTHOR pa2 ON pa1.PaperID = pa2.PaperID
JOIN AUTHOR a2 ON pa2.AuthorID = a2.AuthorID
WHERE pa1.AuthorID = :authorId AND pa2.AuthorID <> :authorId
GROUP BY pa2.AuthorID, a2.Name
ORDER BY id ASC
"""

# 2. Authors within N co-author hops (recursive CTE with CYCLE clause on Oracle 26ai)
SQL_WITHIN_HOPS = """
WITH coauthor_rel (a1, a2) AS (
  SELECT DISTINCT pa1.AuthorID, pa2.AuthorID
  FROM PAPER_AUTHOR pa1
  JOIN PAPER_AUTHOR pa2 ON pa1.PaperID = pa2.PaperID
  WHERE pa1.AuthorID <> pa2.AuthorID
),
reach (author_id, depth) AS (
  SELECT a2, 1
  FROM coauthor_rel
  WHERE a1 = :authorId
  UNION ALL
  SELECT r.a2, reach.depth + 1
  FROM reach
  JOIN coauthor_rel r ON reach.author_id = r.a1
  WHERE reach.depth < :hops
)
CYCLE author_id SET is_cycle TO 'Y' DEFAULT 'N'
SELECT DISTINCT r.author_id AS id, a.Name AS name
FROM reach r
JOIN AUTHOR a ON r.author_id = a.AuthorID
WHERE r.author_id <> :authorId
ORDER BY id ASC
"""

# 3. Shortest collaboration path between two authors
SQL_SHORTEST_PATH = """
WITH coauthor_rel (a1, a2, paper_id) AS (
  SELECT DISTINCT pa1.AuthorID, pa2.AuthorID, pa1.PaperID
  FROM PAPER_AUTHOR pa1
  JOIN PAPER_AUTHOR pa2 ON pa1.PaperID = pa2.PaperID
  WHERE pa1.AuthorID <> pa2.AuthorID
),
path_search (current_author, path_str, depth) AS (
  SELECT a2, TO_CHAR(:fromAuthorId || '->' || paper_id || '->' || a2), 1
  FROM coauthor_rel
  WHERE a1 = :fromAuthorId
  UNION ALL
  SELECT r.a2, TO_CHAR(ps.path_str || '->' || r.paper_id || '->' || r.a2), ps.depth + 1
  FROM path_search ps
  JOIN coauthor_rel r ON ps.current_author = r.a1
  WHERE ps.depth < 4
)
CYCLE current_author SET is_cycle TO 'Y' DEFAULT 'N'
SELECT depth AS hops, path_str
FROM path_search
WHERE current_author = :toAuthorId
ORDER BY depth ASC
FETCH FIRST 1 ROWS ONLY
"""

# 4. Conflict of interest check (blocked reviewer-paper pairs)
SQL_CONFLICT_CHECK = """
SELECT r.ReviewerID AS reviewer_id, pa.PaperID AS paper_id, r.Name AS reviewer_name, p.Title AS paper_title
FROM REVIEWER r
JOIN AUTHOR a ON LOWER(r.Email) = LOWER(a.Email)
JOIN PAPER_AUTHOR pa ON a.AuthorID = pa.AuthorID
JOIN PAPER p ON pa.PaperID = p.PaperID
ORDER BY r.ReviewerID ASC, pa.PaperID ASC
"""

SQL_CONFLICT_VIOLATIONS = """
SELECT COUNT(*) AS violation_count
FROM REVIEWER r
JOIN AUTHOR a ON LOWER(r.Email) = LOWER(a.Email)
JOIN PAPER_AUTHOR pa ON a.AuthorID = pa.AuthorID
JOIN PAPER_REVIEWER pr ON r.ReviewerID = pr.ReviewerID AND pa.PaperID = pr.PaperID
"""

# 5. Average score per paper (aggregation)
SQL_AVG_SCORE = """
SELECT p.PaperID AS id, p.Title AS title, COUNT(r.ReviewID) AS review_count, ROUND(AVG(r.Score), 2) AS avg_score
FROM PAPER p
LEFT JOIN REVIEW r ON p.PaperID = r.PaperID
GROUP BY p.PaperID, p.Title
ORDER BY id ASC
"""

# Real dataset size query for Oracle
SQL_DATASET_STATS = """
SELECT
  (SELECT COUNT(*) FROM AUTHOR) AS author_count,
  (SELECT COUNT(*) FROM PAPER) AS paper_count,
  (SELECT COUNT(DISTINCT pa1.AuthorID || '-' || pa2.AuthorID)
   FROM PAPER_AUTHOR pa1
   JOIN PAPER_AUTHOR pa2 ON pa1.PaperID = pa2.PaperID
   WHERE pa1.AuthorID < pa2.AuthorID) AS coauthor_pair_count
FROM DUAL
"""
