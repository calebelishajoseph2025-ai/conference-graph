"""
Cypher query definitions and templates for Neo4j.
Strictly parameterised ($param) queries for all graph operations.
"""

# Health and node queries
MATCH_NODE_COUNT = "MATCH (n) RETURN count(n) AS c"
MATCH_REL_COUNT = "MATCH ()-[r]->() RETURN count(r) AS c"
MATCH_SAME_PERSON_COUNT = "MATCH ()-[r:SAME_PERSON_AS]->() RETURN count(r) AS c"

# Graph Autocomplete Search
SEARCH_AUTHORS = """
MATCH (a:Author)
WHERE toLower(a.name) CONTAINS toLower($q)
RETURN 'Author' AS label, 'author' AS type, a.authorId AS rawId, a.name AS title,
       coalesce(a.affiliation, '') + ' • ' + coalesce(a.country, '') AS subtitle
ORDER BY a.name
LIMIT $limit
"""

SEARCH_REVIEWERS = """
MATCH (r:Reviewer)
WHERE toLower(r.name) CONTAINS toLower($q)
RETURN 'Reviewer' AS label, 'reviewer' AS type, r.reviewerId AS rawId, r.name AS title,
       coalesce(r.expertise, '') + ' • ' + coalesce(r.affiliation, '') AS subtitle
ORDER BY r.name
LIMIT $limit
"""

SEARCH_PAPERS = """
MATCH (p:Paper)
WHERE toLower(p.title) CONTAINS toLower($q)
RETURN 'Paper' AS label, 'paper' AS type, p.paperId AS rawId, p.title AS title,
       'Status: ' + coalesce(p.status, 'Unknown') AS subtitle
ORDER BY p.title
LIMIT $limit
"""

# Neighborhood Traversals
NEIGHBORHOOD_DEPTH_1 = """
MATCH (center)
WHERE ($label = 'Author' AND center:Author AND center.authorId = $id)
   OR ($label = 'Reviewer' AND center:Reviewer AND center.reviewerId = $id)
   OR ($label = 'Paper' AND center:Paper AND center.paperId = $id)
   OR ($label = 'Conference' AND center:Conference AND center.confId = $id)
   OR ($label = 'Track' AND center:Track AND center.trackId = $id)
   OR ($label = 'Session' AND center:Session AND center.sessionId = $id)
   OR ($label = 'Keyword' AND center:Keyword AND center.keywordId = $id)
   OR ($label = 'Presentation' AND center:Presentation AND center.presentationId = $id)
OPTIONAL MATCH (center)-[r]-(neighbor)
WITH center, collect(DISTINCT neighbor)[..149] AS rawNeighbors
WITH [center] + [n IN rawNeighbors WHERE n IS NOT NULL] AS targetNodes
UNWIND targetNodes AS n
OPTIONAL MATCH (n)-[r]->(m) WHERE m IN targetNodes
RETURN targetNodes, collect(DISTINCT r) AS rels
"""

NEIGHBORHOOD_DEPTH_2 = """
MATCH (center)
WHERE ($label = 'Author' AND center:Author AND center.authorId = $id)
   OR ($label = 'Reviewer' AND center:Reviewer AND center.reviewerId = $id)
   OR ($label = 'Paper' AND center:Paper AND center.paperId = $id)
   OR ($label = 'Conference' AND center:Conference AND center.confId = $id)
   OR ($label = 'Track' AND center:Track AND center.trackId = $id)
   OR ($label = 'Session' AND center:Session AND center.sessionId = $id)
   OR ($label = 'Keyword' AND center:Keyword AND center.keywordId = $id)
   OR ($label = 'Presentation' AND center:Presentation AND center.presentationId = $id)
OPTIONAL MATCH (center)-[r1]-(n1)
WITH center, collect(DISTINCT n1)[..149] AS directNeighbors
UNWIND (CASE WHEN size(directNeighbors) > 0 THEN directNeighbors ELSE [null] END) AS n1
OPTIONAL MATCH (n1)-[r2]-(n2)
WHERE n2 <> center AND NOT n2 IN directNeighbors
WITH center, directNeighbors, collect(DISTINCT n2) AS secondHop
WITH [center] + [n IN directNeighbors WHERE n IS NOT NULL] + secondHop[..(149 - size(directNeighbors))] AS targetNodes
UNWIND targetNodes AS n
OPTIONAL MATCH (n)-[r]->(m) WHERE m IN targetNodes
RETURN targetNodes, collect(DISTINCT r) AS rels
"""

# Overview starter graph (Conference + Tracks + up to 20 Papers)
GRAPH_OVERVIEW = """
MATCH (c:Conference {confId: $confId})
OPTIONAL MATCH (t:Track)-[:PART_OF]->(c)
WITH c, collect(DISTINCT t) AS tracks
OPTIONAL MATCH (p:Paper)-[:SUBMITTED_TO]->(c)
WITH c, tracks, p
ORDER BY p.paperId ASC
WITH c, tracks, collect(DISTINCT p)[..20] AS papers
WITH [c] + tracks + papers AS allNodes
UNWIND allNodes AS n
OPTIONAL MATCH (n)-[r]->(m) WHERE m IN allNodes
RETURN allNodes, collect(DISTINCT r) AS allRels
"""

# --- Operations: ID Generation ---
GET_NEXT_PAPER_ID = """
MATCH (p:Paper)
RETURN coalesce(max(p.paperId), 0) + 1 AS nextId
"""

GET_NEXT_SUBMISSION_ID = """
MATCH ()-[r:SUBMITTED]->()
RETURN coalesce(max(r.submissionId), 0) + 1 AS nextSubId
"""

GET_NEXT_REVIEW_ID = """
MATCH ()-[r:REVIEWED]->()
RETURN coalesce(max(r.reviewId), 0) + 1 AS nextReviewId
"""

# --- Operations: Paper CRUD ---
CREATE_PAPER_TX = """
CREATE (p:Paper {
    paperId: $paperId,
    title: $title,
    abstract: $abstract,
    status: 'Submitted',
    submissionDate: date($submissionDate)
})
WITH p
MATCH (c:Conference {confId: $confId})
MATCH (t:Track {trackId: $trackId})
CREATE (p)-[:SUBMITTED_TO]->(c)
CREATE (p)-[:IN_TRACK]->(t)
WITH p
MATCH (ca:Author {authorId: $correspondingAuthorId})
CREATE (ca)-[:SUBMITTED {
    submissionId: $submissionId,
    date: date($submissionDate),
    source: 'Web',
    status: 'Submitted'
}]->(p)
WITH p
UNWIND $authors AS au
MATCH (a:Author {authorId: au.authorId})
CREATE (a)-[:WROTE {authorOrder: au.authorOrder, isCorresponding: au.isCorresponding}]->(p)
WITH DISTINCT p
UNWIND (CASE WHEN size($keywordIds) > 0 THEN $keywordIds ELSE [null] END) AS kid
OPTIONAL MATCH (k:Keyword {keywordId: kid})
FOREACH (_ IN CASE WHEN k IS NOT NULL THEN [1] ELSE [] END |
    CREATE (p)-[:HAS_KEYWORD]->(k)
)
WITH DISTINCT p
RETURN p.paperId AS paperId, p.title AS title, p.status AS status, toString(p.submissionDate) AS submissionDate
"""

COUNT_PAPERS = """
MATCH (p:Paper)
WHERE ($status IS NULL OR p.status = $status)
  AND ($confId IS NULL OR EXISTS { MATCH (p)-[:SUBMITTED_TO]->(:Conference {confId: $confId}) })
  AND ($q IS NULL OR toLower(p.title) CONTAINS toLower($q) OR toLower(p.abstract) CONTAINS toLower($q))
RETURN count(p) AS total
"""

LIST_PAPERS = """
MATCH (p:Paper)
WHERE ($status IS NULL OR p.status = $status)
  AND ($confId IS NULL OR EXISTS { MATCH (p)-[:SUBMITTED_TO]->(:Conference {confId: $confId}) })
  AND ($q IS NULL OR toLower(p.title) CONTAINS toLower($q) OR toLower(p.abstract) CONTAINS toLower($q))
WITH p
ORDER BY p.paperId DESC
SKIP $skip
LIMIT $limit

OPTIONAL MATCH (p)-[:SUBMITTED_TO]->(c:Conference)
OPTIONAL MATCH (p)-[:IN_TRACK]->(t:Track)
OPTIONAL MATCH (a:Author)-[w:WROTE]->(p)
WITH p, c, t, collect(DISTINCT {
    authorId: a.authorId,
    name: a.name,
    email: a.email,
    affiliation: a.affiliation,
    authorOrder: w.authorOrder,
    isCorresponding: w.isCorresponding
}) AS authors

OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
WITH p, c, t, authors, collect(DISTINCT {keywordId: k.keywordId, keyword: k.keyword}) AS keywords

OPTIONAL MATCH (rv:Reviewer)-[ass:ASSIGNED_TO]->(p)
WITH p, c, t, authors, keywords, collect(DISTINCT rv.reviewerId) AS assignedReviewerIds

OPTIONAL MATCH (rv2:Reviewer)-[rev:REVIEWED]->(p)
WITH p, c, t, authors, keywords, assignedReviewerIds,
     count(DISTINCT rev) AS reviewCount,
     round(avg(rev.score) * 100) / 100.0 AS avgScore,
     collect(DISTINCT rv2.reviewerId) AS reviewedReviewerIds

RETURN p.paperId AS paperId,
       p.title AS title,
       p.abstract AS abstract,
       p.status AS status,
       toString(p.submissionDate) AS submissionDate,
       c.confId AS confId,
       c.name AS confName,
       t.trackId AS trackId,
       t.name AS trackName,
       [a IN authors WHERE a.authorId IS NOT NULL] AS authors,
       [k IN keywords WHERE k.keywordId IS NOT NULL] AS keywords,
       reviewCount,
       avgScore,
       size([rid IN assignedReviewerIds WHERE NOT rid IN reviewedReviewerIds]) AS pendingReviewCount
ORDER BY paperId DESC
"""

GET_PAPER_BY_ID = """
MATCH (p:Paper {paperId: $paperId})
OPTIONAL MATCH (p)-[:SUBMITTED_TO]->(c:Conference)
OPTIONAL MATCH (p)-[:IN_TRACK]->(t:Track)
OPTIONAL MATCH (a:Author)-[w:WROTE]->(p)
WITH p, c, t, collect(DISTINCT {
    authorId: a.authorId,
    name: a.name,
    email: a.email,
    affiliation: a.affiliation,
    country: a.country,
    authorOrder: w.authorOrder,
    isCorresponding: w.isCorresponding
}) AS authors

OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(k:Keyword)
WITH p, c, t, authors, collect(DISTINCT {keywordId: k.keywordId, keyword: k.keyword}) AS keywords

OPTIONAL MATCH (rv:Reviewer)-[ass:ASSIGNED_TO]->(p)
OPTIONAL MATCH (rv)-[revCheck:REVIEWED]->(p)
WITH p, c, t, authors, keywords, collect(DISTINCT {
    reviewerId: rv.reviewerId,
    name: rv.name,
    email: rv.email,
    affiliation: rv.affiliation,
    expertise: rv.expertise,
    assignedDate: toString(ass.assignedDate),
    hasReviewed: revCheck IS NOT NULL
}) AS assignments

OPTIONAL MATCH (rv2:Reviewer)-[rev:REVIEWED]->(p)
WITH p, c, t, authors, keywords, assignments,
     round(avg(rev.score) * 100) / 100.0 AS avgScore,
     collect(DISTINCT {
         reviewId: rev.reviewId,
         reviewerId: rv2.reviewerId,
         reviewerName: rv2.name,
         score: rev.score,
         comments: rev.comments,
         recommendation: rev.recommendation,
         reviewDate: toString(rev.reviewDate)
     }) AS reviews

RETURN p.paperId AS paperId,
       p.title AS title,
       p.abstract AS abstract,
       p.status AS status,
       toString(p.submissionDate) AS submissionDate,
       {confId: c.confId, name: c.name, year: c.year, venue: c.venue} AS conference,
       {trackId: t.trackId, name: t.name} AS track,
       [a IN authors WHERE a.authorId IS NOT NULL] AS authors,
       [k IN keywords WHERE k.keywordId IS NOT NULL] AS keywords,
       [ass IN assignments WHERE ass.reviewerId IS NOT NULL] AS assignments,
       [r IN reviews WHERE r.reviewId IS NOT NULL] AS reviews,
       avgScore,
       size([ass IN assignments WHERE ass.reviewerId IS NOT NULL AND NOT ass.hasReviewed]) AS pendingReviewCount
"""

GET_PAPER_DETAILS = GET_PAPER_BY_ID

UPDATE_PAPER = """
MATCH (p:Paper {paperId: $paperId})
SET p.title = CASE WHEN $title IS NOT NULL THEN $title ELSE p.title END,
    p.abstract = CASE WHEN $abstract IS NOT NULL THEN $abstract ELSE p.abstract END,
    p.status = CASE WHEN $status IS NOT NULL THEN $status ELSE p.status END
RETURN p.paperId AS paperId, p.title AS title, p.abstract AS abstract, p.status AS status,
       toString(p.submissionDate) AS submissionDate
"""

DELETE_PAPER = """
MATCH (p:Paper {paperId: $paperId})
OPTIONAL MATCH (pr:Presentation)-[:PRESENTS]->(p)
DETACH DELETE pr, p
"""

# --- Operations: Conflict of Interest (COI) & Reviewer Assignment ---
CHECK_COI_TRAVERSAL = """
MATCH (rv:Reviewer {reviewerId: $reviewerId})
MATCH (p:Paper {paperId: $paperId})
OPTIONAL MATCH (rv)-[s:SAME_PERSON_AS]->(a1:Author)-[w1:WROTE]->(p)
OPTIONAL MATCH (a2:Author)-[w2:WROTE]->(p)
  WHERE toLower(a2.email) = toLower(rv.email)
RETURN rv, p,
       a1, s, w1,
       a2, w2
"""

CHECK_EXISTING_ASSIGNMENT = """
MATCH (rv:Reviewer {reviewerId: $reviewerId})-[r:ASSIGNED_TO]->(p:Paper {paperId: $paperId})
RETURN count(r) > 0 AS isAssigned
"""

CREATE_ASSIGNMENT_TX = """
MATCH (rv:Reviewer {reviewerId: $reviewerId})
MATCH (p:Paper {paperId: $paperId})
CREATE (rv)-[r:ASSIGNED_TO {assignedDate: date($assignedDate)}]->(p)
WITH rv, p, r
SET p.status = CASE WHEN p.status = 'Submitted' THEN 'Under Review' ELSE p.status END
RETURN rv.reviewerId AS reviewerId, rv.name AS reviewerName,
       p.paperId AS paperId, p.title AS paperTitle, p.status AS paperStatus,
       toString(r.assignedDate) AS assignedDate
"""

# --- Operations: Reviews & Auto-accept rule ---
CHECK_EXISTING_REVIEW = """
MATCH (rv:Reviewer {reviewerId: $reviewerId})-[r:REVIEWED]->(p:Paper {paperId: $paperId})
RETURN count(r) > 0 AS hasReviewed
"""

CREATE_REVIEW_TX = """
MATCH (rv:Reviewer {reviewerId: $reviewerId})
MATCH (p:Paper {paperId: $paperId})
CREATE (rv)-[r:REVIEWED {
    reviewId: $reviewId,
    score: $score,
    comments: $comments,
    recommendation: $recommendation,
    reviewDate: date($reviewDate)
}]->(p)
WITH rv, p, r, p.status AS oldStatus
SET p.status = CASE
    WHEN $score >= 9 AND p.status <> 'Rejected' THEN 'Accepted'
    ELSE p.status
END
RETURN r.reviewId AS reviewId,
       rv.reviewerId AS reviewerId,
       rv.name AS reviewerName,
       p.paperId AS paperId,
       p.title AS paperTitle,
       p.status AS paperStatus,
       r.score AS score,
       r.recommendation AS recommendation,
       r.comments AS comments,
       toString(r.reviewDate) AS reviewDate,
       (oldStatus <> 'Accepted' AND p.status = 'Accepted') AS autoAccepted
"""

# --- Operations: Recommender ---
RECOMMEND_REVIEWERS = """
MATCH (p:Paper {paperId: $paperId})
MATCH (p)-[:IN_TRACK]->(t:Track)
OPTIONAL MATCH (p)-[:HAS_KEYWORD]->(pk:Keyword)
WITH p, t, collect(DISTINCT pk.keywordId) AS paperKeywordIds

MATCH (rv:Reviewer)
WHERE NOT (rv)-[:ASSIGNED_TO]->(p)
AND NOT ((rv)-[:SAME_PERSON_AS]->(:Author)-[:WROTE]->(p) OR EXISTS {
    MATCH (a:Author)-[:WROTE]->(p)
    WHERE toLower(a.email) = toLower(rv.email)
})

OPTIONAL MATCH (rv)-[:REVIEWED]->(pastPaper:Paper)-[:HAS_KEYWORD]->(rk:Keyword)
WHERE rk.keywordId IN paperKeywordIds
WITH p, t, rv, collect(DISTINCT rk.keyword) AS sharedKeywords

WITH p, t, rv, sharedKeywords,
     size(sharedKeywords) AS sharedKeywordCount,
     CASE WHEN toLower(rv.expertise) = toLower(t.name) THEN 5.0
          WHEN toLower(rv.expertise) CONTAINS toLower(t.name) OR toLower(t.name) CONTAINS toLower(rv.expertise) THEN 3.0
          ELSE 0.0 END AS expertiseScore

OPTIONAL MATCH (rv)-[:ASSIGNED_TO]->(assignedPaper:Paper)
WHERE NOT (rv)-[:REVIEWED]->(assignedPaper)
WITH rv, sharedKeywords, sharedKeywordCount, expertiseScore, count(assignedPaper) AS workload

WITH rv, sharedKeywords, sharedKeywordCount, expertiseScore, workload,
     round(((sharedKeywordCount * 3.0) + expertiseScore - (workload * 1.0)) * 100) / 100.0 AS totalScore
ORDER BY totalScore DESC, workload ASC, rv.name ASC
LIMIT $limit
RETURN rv.reviewerId AS reviewerId,
       rv.name AS name,
       rv.email AS email,
       rv.affiliation AS affiliation,
       rv.expertise AS expertise,
       sharedKeywords,
       sharedKeywordCount,
       round(sharedKeywordCount * 3.0 * 100) / 100.0 AS keywordScore,
       expertiseScore,
       workload,
       round(workload * 1.0 * 100) / 100.0 AS workloadPenalty,
       totalScore
"""

# --- Operations: Profiles ---
GET_AUTHOR_PROFILE = """
MATCH (a:Author {authorId: $authorId})
OPTIONAL MATCH (rv:Reviewer)-[:SAME_PERSON_AS]->(a)

OPTIONAL MATCH (a)-[w:WROTE]->(p:Paper)
OPTIONAL MATCH (p)-[:IN_TRACK]->(t:Track)
OPTIONAL MATCH ()-[rev:REVIEWED]->(p)
WITH a, rv, p, w, t, round(avg(rev.score) * 100) / 100.0 AS avgScore, count(DISTINCT rev) AS reviewCount
ORDER BY p.paperId DESC
WITH a, rv, collect(DISTINCT {
    paperId: p.paperId,
    title: p.title,
    status: p.status,
    submissionDate: toString(p.submissionDate),
    authorOrder: w.authorOrder,
    isCorresponding: w.isCorresponding,
    trackName: t.name,
    avgScore: avgScore,
    reviewCount: reviewCount
}) AS rawPapers

OPTIONAL MATCH (a)-[:WROTE]->(sharedP:Paper)<-[:WROTE]-(co:Author)
WHERE co.authorId <> a.authorId
WITH a, rv, rawPapers, co, count(DISTINCT sharedP) AS sharedCount
ORDER BY sharedCount DESC, co.name ASC
WITH a, rv, rawPapers, collect(DISTINCT {
    authorId: co.authorId,
    name: co.name,
    affiliation: co.affiliation,
    sharedPapers: sharedCount
}) AS rawCoAuthors

RETURN a.authorId AS authorId,
       a.name AS name,
       a.affiliation AS affiliation,
       a.email AS email,
       a.country AS country,
       rv.reviewerId AS linkedReviewerId,
       rv.name AS linkedReviewerName,
       [p IN rawPapers WHERE p.paperId IS NOT NULL] AS papers,
       size([p IN rawPapers WHERE p.paperId IS NOT NULL]) AS totalPapers,
       [co IN rawCoAuthors WHERE co.authorId IS NOT NULL] AS coAuthors
"""

GET_REVIEWER_PROFILE = """
MATCH (rv:Reviewer {reviewerId: $reviewerId})
OPTIONAL MATCH (rv)-[:SAME_PERSON_AS]->(a:Author)

OPTIONAL MATCH (rv)-[ass:ASSIGNED_TO]->(p:Paper)
OPTIONAL MATCH (p)-[:IN_TRACK]->(t:Track)
OPTIONAL MATCH (rv)-[rev:REVIEWED]->(p)
WITH rv, a, p, ass, t, rev
ORDER BY p.paperId DESC
WITH rv, a,
     round(avg(rev.score) * 100) / 100.0 AS avgScoreGiven,
     count(DISTINCT rev) AS totalReviews,
     collect(DISTINCT {
         paperId: p.paperId,
         title: p.title,
         status: p.status,
         trackName: t.name,
         assignedDate: toString(ass.assignedDate),
         hasReviewed: rev IS NOT NULL,
         score: rev.score,
         recommendation: rev.recommendation
     }) AS rawAssigned

RETURN rv.reviewerId AS reviewerId,
       rv.name AS name,
       rv.affiliation AS affiliation,
       rv.email AS email,
       rv.expertise AS expertise,
       rv.country AS country,
       a.authorId AS linkedAuthorId,
       a.name AS linkedAuthorName,
       avgScoreGiven,
       totalReviews,
       size([p IN rawAssigned WHERE p.paperId IS NOT NULL AND NOT p.hasReviewed]) AS activeWorkload,
       size([p IN rawAssigned WHERE p.paperId IS NOT NULL]) AS workload,
       size([p IN rawAssigned WHERE p.paperId IS NOT NULL]) AS totalAssignments,
       [p IN rawAssigned WHERE p.paperId IS NOT NULL] AS assignedPapers
"""

# --- Phase 4a: Graph Analytics Cypher Queries ---

CHECK_AUTHOR_EXISTS = """
MATCH (a:Author {authorId: $authorId})
RETURN a
"""

SHORTEST_COLLAB_PATH = """
MATCH (a1:Author {authorId: $fromAuthorId}), (a2:Author {authorId: $toAuthorId})
OPTIONAL MATCH p = shortestPath((a1)-[:WROTE*..8]-(a2))
RETURN a1, a2, p, length(p) AS relCount
"""

WITHIN_HOPS_TEMPLATE = """
MATCH (a:Author {{authorId: $authorId}})
MATCH p = shortestPath((a)-[:WROTE*..{max_rels}]-(other:Author))
WHERE other.authorId <> a.authorId
WITH other, p ORDER BY length(p) ASC
WITH other, head(collect(p)) AS p
RETURN other.authorId AS authorId,
       other.name AS name,
       other.affiliation AS affiliation,
       other.country AS country,
       toInteger(length(p)/2) AS hops,
       [n IN nodes(p) WHERE n:Paper | {{ paperId: n.paperId, title: n.title }}] AS intermediatePapers
ORDER BY hops ASC, other.name ASC
"""

CENTRAL_AUTHORS = """
MATCH (a:Author)
OPTIONAL MATCH (a)-[:WROTE]->(p:Paper)
WITH a, count(DISTINCT p) AS paperCount
OPTIONAL MATCH (a)-[:WROTE]->(sharedP:Paper)<-[:WROTE]-(co:Author)
WHERE co.authorId <> a.authorId
WITH a, paperCount, count(DISTINCT co) AS distinctCoauthors
RETURN a.authorId AS authorId,
       a.name AS name,
       a.affiliation AS affiliation,
       a.country AS country,
       distinctCoauthors,
       paperCount
ORDER BY distinctCoauthors DESC, paperCount DESC, a.name ASC
LIMIT $limit
"""

INSTITUTION_PAIRS = """
MATCH (a1:Author)-[:WROTE]->(p:Paper)<-[:WROTE]-(a2:Author)
WHERE a1.affiliation IS NOT NULL
  AND a2.affiliation IS NOT NULL
  AND a1.affiliation < a2.affiliation
RETURN a1.affiliation AS institution1,
       a2.affiliation AS institution2,
       count(DISTINCT p) AS jointPapers,
       count(DISTINCT a1.authorId) AS authors1,
       count(DISTINCT a2.authorId) AS authors2
ORDER BY jointPapers DESC, institution1 ASC, institution2 ASC
LIMIT $limit
"""

RESEARCH_AREAS_PAPER_COUNTS = """
MATCH (t:Track)
OPTIONAL MATCH (p:Paper)-[:IN_TRACK]->(t)
WITH t.name AS areaName, count(DISTINCT p) AS paperCount
RETURN areaName, sum(paperCount) AS paperCount
ORDER BY paperCount DESC, areaName ASC
"""

TRACK_PAPER_COUNTS = """
MATCH (t:Track)-[:PART_OF]->(c:Conference)
OPTIONAL MATCH (p:Paper)-[:IN_TRACK]->(t)
RETURN t.trackId AS trackId,
       t.name AS trackName,
       c.name AS conferenceName,
       c.acronym AS conferenceAcronym,
       count(DISTINCT p) AS paperCount
ORDER BY paperCount DESC, trackName ASC
"""

TOP_INSTITUTIONS = """
MATCH (a:Author)
WHERE a.affiliation IS NOT NULL
OPTIONAL MATCH (a)-[:WROTE]->(p:Paper)
RETURN a.affiliation AS institution,
       count(DISTINCT a) AS authorCount,
       count(DISTINCT p) AS paperCount
ORDER BY paperCount DESC, authorCount DESC, institution ASC
LIMIT $limit
"""

# --- Phase 5: Comparison Scenarios (Cypher) ---

COMPARE_COAUTHORS = """
MATCH (a:Author {authorId: $authorId})-[:WROTE]->(p:Paper)<-[:WROTE]-(co:Author)
WHERE co.authorId <> a.authorId
RETURN DISTINCT co.authorId AS id, co.name AS name, count(DISTINCT p) AS shared_papers
ORDER BY id ASC
"""

COMPARE_WITHIN_HOPS_TEMPLATE = """
MATCH (a:Author {{authorId: $authorId}})
MATCH (a)-[:WROTE*2..{max_rels}]-(other:Author)
WHERE other.authorId <> a.authorId
WITH DISTINCT other
RETURN other.authorId AS id, other.name AS name
ORDER BY id ASC
"""

COMPARE_SHORTEST_PATH = """
MATCH (a1:Author {authorId: $fromAuthorId}), (a2:Author {authorId: $toAuthorId})
OPTIONAL MATCH p = shortestPath((a1)-[:WROTE*..8]-(a2))
RETURN toInteger(length(p) / 2) AS hops, [n IN nodes(p) | coalesce(n.name, n.title)] AS path_nodes
"""

COMPARE_CONFLICT_CHECK = """
MATCH (rv:Reviewer)-[:SAME_PERSON_AS]->(a:Author)-[:WROTE]->(p:Paper)
RETURN rv.reviewerId AS reviewer_id, p.paperId AS paper_id, rv.name AS reviewer_name, p.title AS paper_title
ORDER BY rv.reviewerId ASC, p.paperId ASC
"""

COMPARE_CONFLICT_VIOLATIONS = """
MATCH (rv:Reviewer)-[:SAME_PERSON_AS]->(a:Author)-[:WROTE]->(p:Paper)<-[:ASSIGNED_TO]-(rv)
RETURN count(p) AS violation_count
"""

COMPARE_AVG_SCORE_QUERY = """
MATCH (p:Paper)
OPTIONAL MATCH ()-[r:REVIEWED]->(p)
WITH p, count(r) AS review_count, round(avg(r.score) * 100) / 100.0 AS avg_score
RETURN p.paperId AS id, p.title AS title, review_count, avg_score
ORDER BY id ASC
"""

COMPARE_DATASET_STATS = """
MATCH (a:Author) WITH count(a) AS author_count
MATCH (p:Paper) WITH author_count, count(p) AS paper_count
OPTIONAL MATCH (a1:Author)-[:WROTE]->(:Paper)<-[:WROTE]-(a2:Author) WHERE a1.authorId < a2.authorId
RETURN author_count, paper_count, count(DISTINCT CASE WHEN a1 IS NOT NULL THEN [a1.authorId, a2.authorId] END) AS coauthor_pair_count
"""

