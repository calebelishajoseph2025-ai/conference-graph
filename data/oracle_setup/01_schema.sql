-- Run as ACADEMIC:  sqlplus academic/123456@localhost:1521/FREEPDB1
-- Creates sequences, 13 tables, views, PL/SQL objects. Based on the tested DA2 scripts.
-- Differences from the original DA2 file: PRESENTATION.Mode is DeliveryMode (MODE is reserved, ORA-03050),
-- and sequences start AFTER the ids used by the DA3 dataset (so sp_add_paper never collides).
SET DEFINE OFF
SET SQLBLANKLINES ON
SET SERVEROUTPUT ON

-- ---------- sequences (start values = max id in dataset + 1) ----------
CREATE SEQUENCE ConfID_SEQ         START WITH 6   INCREMENT BY 1;
CREATE SEQUENCE TrackID_SEQ        START WITH 18  INCREMENT BY 1;
CREATE SEQUENCE SessionID_SEQ      START WITH 41  INCREMENT BY 1;
CREATE SEQUENCE PaperID_SEQ        START WITH 111 INCREMENT BY 1;
CREATE SEQUENCE AuthorID_SEQ       START WITH 151 INCREMENT BY 1;
CREATE SEQUENCE ReviewerID_SEQ     START WITH 46  INCREMENT BY 1;
CREATE SEQUENCE ReviewID_SEQ       START WITH 250 INCREMENT BY 1;
CREATE SEQUENCE SubmissionID_SEQ   START WITH 111 INCREMENT BY 1;
CREATE SEQUENCE KeywordID_SEQ      START WITH 29  INCREMENT BY 1;
CREATE SEQUENCE PresentationID_SEQ START WITH 50  INCREMENT BY 1;

-- ---------- tables ----------
CREATE TABLE CONFERENCE (
    ConfID     NUMBER PRIMARY KEY,
    Name       VARCHAR2(150) NOT NULL,
    Year       NUMBER(4) NOT NULL,
    StartDate  DATE NOT NULL,
    EndDate    DATE NOT NULL,
    Venue      VARCHAR2(150),
    CONSTRAINT chk_conf_dates CHECK (EndDate >= StartDate)
);

CREATE TABLE TRACK (
    TrackID     NUMBER PRIMARY KEY,
    TrackName   VARCHAR2(100) NOT NULL,
    Description VARCHAR2(500),
    ConfID      NUMBER NOT NULL,
    CONSTRAINT fk_track_conf FOREIGN KEY (ConfID) REFERENCES CONFERENCE(ConfID)
);

CREATE TABLE SESSION_TBL (
    SessionID   NUMBER PRIMARY KEY,
    SessionName VARCHAR2(100) NOT NULL,
    SessionDate DATE NOT NULL,
    StartTime   VARCHAR2(10),
    EndTime     VARCHAR2(10),
    Room        VARCHAR2(50),
    ConfID      NUMBER NOT NULL,
    CONSTRAINT fk_session_conf FOREIGN KEY (ConfID) REFERENCES CONFERENCE(ConfID)
);

CREATE TABLE AUTHOR (
    AuthorID    NUMBER PRIMARY KEY,
    Name        VARCHAR2(100) NOT NULL,
    Affiliation VARCHAR2(150),
    Email       VARCHAR2(100) UNIQUE NOT NULL,
    Country     VARCHAR2(50)
);

CREATE TABLE REVIEWER (
    ReviewerID  NUMBER PRIMARY KEY,
    Name        VARCHAR2(100) NOT NULL,
    Affiliation VARCHAR2(150),
    Email       VARCHAR2(100) UNIQUE NOT NULL,
    Expertise   VARCHAR2(150),
    Country     VARCHAR2(50)
);

CREATE TABLE PAPER (
    PaperID        NUMBER PRIMARY KEY,
    Title          VARCHAR2(250) NOT NULL,
    Abstract       VARCHAR2(1000),
    ConfID         NUMBER NOT NULL,
    TrackID        NUMBER,
    Status         VARCHAR2(20) DEFAULT 'Submitted'
                   CHECK (Status IN ('Submitted','Under Review','Accepted','Rejected')),
    SubmissionDate DATE DEFAULT SYSDATE,
    CONSTRAINT fk_paper_conf  FOREIGN KEY (ConfID)  REFERENCES CONFERENCE(ConfID),
    CONSTRAINT fk_paper_track FOREIGN KEY (TrackID) REFERENCES TRACK(TrackID)
);

CREATE TABLE PAPER_AUTHOR (
    PaperID        NUMBER,
    AuthorID       NUMBER,
    AuthorOrder    NUMBER,
    IsCorresponding CHAR(1) DEFAULT 'N' CHECK (IsCorresponding IN ('Y','N')),
    PRIMARY KEY (PaperID, AuthorID),
    CONSTRAINT fk_pa_paper  FOREIGN KEY (PaperID)  REFERENCES PAPER(PaperID),
    CONSTRAINT fk_pa_author FOREIGN KEY (AuthorID) REFERENCES AUTHOR(AuthorID)
);

CREATE TABLE PAPER_REVIEWER (
    PaperID      NUMBER,
    ReviewerID   NUMBER,
    AssignedDate DATE DEFAULT SYSDATE,
    PRIMARY KEY (PaperID, ReviewerID),
    CONSTRAINT fk_pr_paper    FOREIGN KEY (PaperID)    REFERENCES PAPER(PaperID),
    CONSTRAINT fk_pr_reviewer FOREIGN KEY (ReviewerID) REFERENCES REVIEWER(ReviewerID)
);

CREATE TABLE REVIEW (
    ReviewID       NUMBER PRIMARY KEY,
    PaperID        NUMBER NOT NULL,
    ReviewerID     NUMBER NOT NULL,
    Score          NUMBER(2) CHECK (Score BETWEEN 0 AND 10),
    Comments       VARCHAR2(1000),
    ReviewDate     DATE DEFAULT SYSDATE,
    Recommendation VARCHAR2(20) CHECK (Recommendation IN ('Accept','Reject','Minor Revision','Major Revision')),
    CONSTRAINT fk_review_pr FOREIGN KEY (PaperID, ReviewerID)
        REFERENCES PAPER_REVIEWER(PaperID, ReviewerID),
    CONSTRAINT uq_review_once UNIQUE (PaperID, ReviewerID)
);

CREATE TABLE SUBMISSION (
    SubmissionID   NUMBER PRIMARY KEY,
    PaperID        NUMBER NOT NULL,
    SubmittedBy    NUMBER NOT NULL,
    SubmissionDate DATE DEFAULT SYSDATE,
    Status         VARCHAR2(20),
    Source         VARCHAR2(50),
    CONSTRAINT fk_sub_paper  FOREIGN KEY (PaperID)     REFERENCES PAPER(PaperID),
    CONSTRAINT fk_sub_author FOREIGN KEY (SubmittedBy) REFERENCES AUTHOR(AuthorID)
);

CREATE TABLE KEYWORD (
    KeywordID NUMBER PRIMARY KEY,
    Keyword   VARCHAR2(50) UNIQUE NOT NULL
);

CREATE TABLE PAPER_KEYWORD (
    PaperID   NUMBER,
    KeywordID NUMBER,
    PRIMARY KEY (PaperID, KeywordID),
    CONSTRAINT fk_pk_paper   FOREIGN KEY (PaperID)   REFERENCES PAPER(PaperID),
    CONSTRAINT fk_pk_keyword FOREIGN KEY (KeywordID) REFERENCES KEYWORD(KeywordID)
);

CREATE TABLE PRESENTATION (
    PresentationID NUMBER PRIMARY KEY,
    SessionID      NUMBER NOT NULL,
    StartTime      VARCHAR2(10),
    EndTime        VARCHAR2(10),
    DeliveryMode   VARCHAR2(20) CHECK (DeliveryMode IN ('Online','Offline')),
    CONSTRAINT fk_pres_session FOREIGN KEY (SessionID) REFERENCES SESSION_TBL(SessionID)
);

-- ---------- views (from DA2 part 6) ----------
CREATE OR REPLACE VIEW vw_paper_overview AS
SELECT p.PaperID, p.Title, c.Name AS ConferenceName, t.TrackName, p.Status
FROM PAPER p
JOIN CONFERENCE c ON p.ConfID = c.ConfID
JOIN TRACK t ON p.TrackID = t.TrackID;

CREATE OR REPLACE VIEW vw_reviewer_workload AS
SELECT rv.ReviewerID, rv.Name, COUNT(prv.PaperID) AS AssignedCount,
       ROUND(AVG(rev.Score), 2) AS AvgScoreGiven
FROM REVIEWER rv
LEFT JOIN PAPER_REVIEWER prv ON rv.ReviewerID = prv.ReviewerID
LEFT JOIN REVIEW rev ON rv.ReviewerID = rev.ReviewerID AND prv.PaperID = rev.PaperID
GROUP BY rv.ReviewerID, rv.Name;

-- ---------- PL/SQL (from DA2 part 7, already tested on 26ai) ----------
CREATE OR REPLACE PROCEDURE sp_add_paper (
    p_title    IN VARCHAR2,
    p_abstract IN VARCHAR2,
    p_confid   IN NUMBER,
    p_trackid  IN NUMBER
) AS
BEGIN
    INSERT INTO PAPER (PaperID, Title, Abstract, ConfID, TrackID, Status, SubmissionDate)
    VALUES (PaperID_SEQ.NEXTVAL, p_title, p_abstract, p_confid, p_trackid, 'Submitted', SYSDATE);
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Paper "' || p_title || '" added successfully.');
END sp_add_paper;
/

CREATE OR REPLACE PROCEDURE sp_assign_reviewer (
    p_paperid    IN NUMBER,
    p_reviewerid IN NUMBER
) AS
    v_conflict NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_conflict
    FROM PAPER_AUTHOR pa
    JOIN AUTHOR a ON pa.AuthorID = a.AuthorID
    JOIN REVIEWER rv ON LOWER(rv.Email) = LOWER(a.Email)
    WHERE pa.PaperID = p_paperid
      AND rv.ReviewerID = p_reviewerid;

    IF v_conflict > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Reviewer cannot be assigned: conflict of interest (co-author).');
    ELSE
        INSERT INTO PAPER_REVIEWER (PaperID, ReviewerID, AssignedDate)
        VALUES (p_paperid, p_reviewerid, SYSDATE);

        UPDATE PAPER
        SET Status = 'Under Review'
        WHERE PaperID = p_paperid AND Status = 'Submitted';

        COMMIT;
        DBMS_OUTPUT.PUT_LINE('Reviewer ' || p_reviewerid || ' assigned to paper ' || p_paperid || '.');
    END IF;
END sp_assign_reviewer;
/

CREATE OR REPLACE FUNCTION fn_avg_score (p_paperid IN NUMBER)
RETURN NUMBER
AS
    v_avg NUMBER;
BEGIN
    SELECT AVG(Score) INTO v_avg
    FROM REVIEW
    WHERE PaperID = p_paperid;

    RETURN NVL(v_avg, 0);
END fn_avg_score;
/

CREATE OR REPLACE FUNCTION fn_reviewer_workload (p_reviewerid IN NUMBER)
RETURN NUMBER
AS
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM PAPER_REVIEWER
    WHERE ReviewerID = p_reviewerid;

    RETURN v_count;
END fn_reviewer_workload;
/

CREATE OR REPLACE TRIGGER trg_no_self_review
BEFORE INSERT ON PAPER_REVIEWER
FOR EACH ROW
DECLARE
    v_cnt NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_cnt
    FROM PAPER_AUTHOR pa
    JOIN AUTHOR a ON pa.AuthorID = a.AuthorID
    JOIN REVIEWER rv ON LOWER(rv.Email) = LOWER(a.Email)
    WHERE pa.PaperID = :NEW.PaperID
      AND rv.ReviewerID = :NEW.ReviewerID;

    IF v_cnt > 0 THEN
        RAISE_APPLICATION_ERROR(-20002, 'Trigger blocked insert: reviewer is a co-author of this paper.');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_flag_paper
AFTER INSERT ON REVIEW
FOR EACH ROW
WHEN (NEW.Score >= 9)
BEGIN
    UPDATE PAPER
    SET Status = 'Accepted'
    WHERE PaperID = :NEW.PaperID
      AND Status != 'Rejected';
END;
/
