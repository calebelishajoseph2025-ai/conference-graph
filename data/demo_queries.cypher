// Technology-specific queries for the DA3 demo (each has a SQL counterpart for the comparison section)

// Q1 Co-author network of one author (SQL: self-join of PAPER_AUTHOR)
MATCH (a:Author {authorId:1})-[:WROTE]->(p)<-[:WROTE]-(co:Author) RETURN a, p, co;

// Q2 Authors within 2 co-author hops (SQL: needs a recursive CTE / double self-join)
MATCH (a:Author {authorId:1})-[:WROTE*2..4]-(x:Author) WHERE x <> a
RETURN DISTINCT x.name, x.affiliation LIMIT 25;

// Q3 Shortest collaboration path between two authors
MATCH (a:Author {authorId:1}), (b:Author {authorId:60}),
      path = shortestPath((a)-[:WROTE*..8]-(b)) RETURN path;

// Q4 Conflict-of-interest detection by traversal (assignments that WOULD be illegal; should return 0 rows for loaded data)
MATCH (rv:Reviewer)-[:ASSIGNED_TO]->(p:Paper)<-[:WROTE]-(a:Author), (rv)-[:SAME_PERSON_AS]->(a)
RETURN rv.name, p.title;

// Q5 Reviewer recommendation: best-matching reviewers for a paper by shared keywords, excluding conflicts
MATCH (p:Paper {paperId:5})-[:HAS_KEYWORD]->(k)<-[:HAS_KEYWORD]-(q:Paper)<-[:REVIEWED]-(rv:Reviewer)
WHERE NOT (rv)-[:SAME_PERSON_AS]->(:Author)-[:WROTE]->(p)
RETURN rv.name, count(DISTINCT k) AS sharedKeywords
ORDER BY sharedKeywords DESC LIMIT 5;

// Q6 Most connected authors (degree centrality via co-authors)
MATCH (a:Author)-[:WROTE]->(:Paper)<-[:WROTE]-(co:Author) WHERE a<>co
RETURN a.name, count(DISTINCT co) AS coauthors ORDER BY coauthors DESC LIMIT 10;

// Q7 Average score per paper, with pending reviews flagged
MATCH (p:Paper)
OPTIONAL MATCH (:Reviewer)-[r:REVIEWED]->(p)
RETURN p.paperId, p.title, p.status, round(avg(r.score)*100)/100 AS avgScore, count(DISTINCT r) AS reviews ORDER BY avgScore DESC;

// Q8 Cross-institution collaboration: pairs of affiliations that co-authored
MATCH (a1:Author)-[:WROTE]->(p)<-[:WROTE]-(a2:Author) WHERE a1.authorId < a2.authorId AND a1.affiliation <> a2.affiliation
RETURN a1.affiliation, a2.affiliation, count(DISTINCT p) AS joint ORDER BY joint DESC LIMIT 10;
