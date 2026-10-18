// Neo4j load script. Copy the CSVs into Neo4j's import folder first (or use file:/// URLs in Desktop).
// 1) Constraints
CREATE CONSTRAINT author_id    IF NOT EXISTS FOR (n:Author)       REQUIRE n.authorId IS UNIQUE;
CREATE CONSTRAINT reviewer_id  IF NOT EXISTS FOR (n:Reviewer)     REQUIRE n.reviewerId IS UNIQUE;
CREATE CONSTRAINT paper_id     IF NOT EXISTS FOR (n:Paper)        REQUIRE n.paperId IS UNIQUE;
CREATE CONSTRAINT conf_id      IF NOT EXISTS FOR (n:Conference)   REQUIRE n.confId IS UNIQUE;
CREATE CONSTRAINT track_id     IF NOT EXISTS FOR (n:Track)        REQUIRE n.trackId IS UNIQUE;
CREATE CONSTRAINT session_id   IF NOT EXISTS FOR (n:Session)      REQUIRE n.sessionId IS UNIQUE;
CREATE CONSTRAINT keyword_id   IF NOT EXISTS FOR (n:Keyword)      REQUIRE n.keywordId IS UNIQUE;
CREATE CONSTRAINT pres_id      IF NOT EXISTS FOR (n:Presentation) REQUIRE n.presentationId IS UNIQUE;

// 2) Nodes
LOAD CSV WITH HEADERS FROM 'file:///conference.csv' AS r
CREATE (:Conference {confId:toInteger(r.ConfID), name:r.Name, year:toInteger(r.Year), startDate:date(r.StartDate), endDate:date(r.EndDate), venue:r.Venue});
LOAD CSV WITH HEADERS FROM 'file:///track.csv' AS r
MATCH (c:Conference {confId:toInteger(r.ConfID)})
CREATE (t:Track {trackId:toInteger(r.TrackID), name:r.TrackName, description:r.Description})-[:PART_OF]->(c);
LOAD CSV WITH HEADERS FROM 'file:///session_tbl.csv' AS r
MATCH (c:Conference {confId:toInteger(r.ConfID)})
CREATE (s:Session {sessionId:toInteger(r.SessionID), name:r.SessionName, date:date(r.SessionDate), startTime:r.StartTime, endTime:r.EndTime, room:r.Room})-[:SCHEDULED_AT]->(c);
LOAD CSV WITH HEADERS FROM 'file:///author.csv' AS r
CREATE (:Author {authorId:toInteger(r.AuthorID), name:r.Name, affiliation:r.Affiliation, email:r.Email, country:r.Country});
LOAD CSV WITH HEADERS FROM 'file:///reviewer.csv' AS r
CREATE (:Reviewer {reviewerId:toInteger(r.ReviewerID), name:r.Name, affiliation:r.Affiliation, email:r.Email, expertise:r.Expertise, country:r.Country});
LOAD CSV WITH HEADERS FROM 'file:///keyword.csv' AS r
CREATE (:Keyword {keywordId:toInteger(r.KeywordID), keyword:r.Keyword});

// 3) Papers + their conference/track
LOAD CSV WITH HEADERS FROM 'file:///paper.csv' AS r
MATCH (c:Conference {confId:toInteger(r.ConfID)}), (t:Track {trackId:toInteger(r.TrackID)})
CREATE (p:Paper {paperId:toInteger(r.PaperID), title:r.Title, abstract:r.Abstract, status:r.Status, submissionDate:date(r.SubmissionDate)})
CREATE (p)-[:SUBMITTED_TO]->(c), (p)-[:IN_TRACK]->(t);

// 4) Relationships (junction tables become edges)
LOAD CSV WITH HEADERS FROM 'file:///paper_author.csv' AS r
MATCH (a:Author {authorId:toInteger(r.AuthorID)}), (p:Paper {paperId:toInteger(r.PaperID)})
CREATE (a)-[:WROTE {authorOrder:toInteger(r.AuthorOrder), isCorresponding:(r.IsCorresponding='Y')}]->(p);
LOAD CSV WITH HEADERS FROM 'file:///paper_keyword.csv' AS r
MATCH (p:Paper {paperId:toInteger(r.PaperID)}), (k:Keyword {keywordId:toInteger(r.KeywordID)})
CREATE (p)-[:HAS_KEYWORD]->(k);
LOAD CSV WITH HEADERS FROM 'file:///submission.csv' AS r
MATCH (a:Author {authorId:toInteger(r.SubmittedBy)}), (p:Paper {paperId:toInteger(r.PaperID)})
CREATE (a)-[:SUBMITTED {submissionId:toInteger(r.SubmissionID), date:date(r.SubmissionDate), source:r.Source, status:r.Status}]->(p);
LOAD CSV WITH HEADERS FROM 'file:///paper_reviewer.csv' AS r
MATCH (rv:Reviewer {reviewerId:toInteger(r.ReviewerID)}), (p:Paper {paperId:toInteger(r.PaperID)})
CREATE (rv)-[:ASSIGNED_TO {assignedDate:date(r.AssignedDate)}]->(p);
// REVIEW becomes properties on a REVIEWED edge (only for assignments that have a review)
LOAD CSV WITH HEADERS FROM 'file:///review.csv' AS r
MATCH (rv:Reviewer {reviewerId:toInteger(r.ReviewerID)}), (p:Paper {paperId:toInteger(r.PaperID)})
CREATE (rv)-[:REVIEWED {reviewId:toInteger(r.ReviewID), score:toInteger(r.Score), comments:r.Comments, reviewDate:date(r.ReviewDate), recommendation:r.Recommendation}]->(p);
// Presentations
LOAD CSV WITH HEADERS FROM 'file:///presentation.csv' AS r
MATCH (s:Session {sessionId:toInteger(r.SessionID)})
CREATE (:Presentation {presentationId:toInteger(r.PresentationID), startTime:r.StartTime, endTime:r.EndTime, deliveryMode:r.DeliveryMode})-[:HELD_IN]->(s);
LOAD CSV WITH HEADERS FROM 'file:///da3_presentation_paper.csv' AS r
MATCH (pr:Presentation {presentationId:toInteger(r.PresentationID)}), (p:Paper {paperId:toInteger(r.PaperID)})
CREATE (pr)-[:PRESENTS]->(p);

// 5) Identity link: a Reviewer and an Author with the same email are the same person.
//    This replaces the email-join conflict check from DA2 with a graph traversal.
MATCH (rv:Reviewer), (a:Author) WHERE rv.email = a.email
CREATE (rv)-[:SAME_PERSON_AS]->(a);

// 6) Sanity checks
MATCH (n) RETURN labels(n)[0] AS label, count(*) AS cnt ORDER BY cnt DESC;
MATCH ()-[r]->() RETURN type(r) AS rel, count(*) AS cnt ORDER BY cnt DESC;
