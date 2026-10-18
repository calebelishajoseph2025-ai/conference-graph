export const SQL_COAUTHORS = `SELECT DISTINCT pa2.AuthorID AS id, a2.Name AS name, COUNT(DISTINCT pa1.PaperID) AS shared_papers
FROM PAPER_AUTHOR pa1
JOIN PAPER_AUTHOR pa2 ON pa1.PaperID = pa2.PaperID
JOIN AUTHOR a2 ON pa2.AuthorID = a2.AuthorID
WHERE pa1.AuthorID = :authorId AND pa2.AuthorID <> :authorId
GROUP BY pa2.AuthorID, a2.Name
ORDER BY id ASC`;

export const COMPARE_COAUTHORS = `MATCH (a:Author {authorId: $authorId})-[:WROTE]->(p:Paper)<-[:WROTE]-(co:Author)
WHERE co.authorId <> a.authorId
RETURN DISTINCT co.authorId AS id, co.name AS name, count(DISTINCT p) AS shared_papers
ORDER BY id ASC`;

export const lineCount = (text: string): number => text.split('\n').length;
