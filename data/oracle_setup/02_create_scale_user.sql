-- Run ONCE as SYSTEM in FREEPDB1:
--   sqlplus system@localhost:1521/FREEPDB1
--   SQL> @02_create_scale_user.sql
SHOW CON_NAME;

-- Create scale user for Phase 6b synthetic scale benchmarks
CREATE USER academic_scale IDENTIFIED BY "ScalePass_2026" QUOTA UNLIMITED ON USERS;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW,
      CREATE PROCEDURE, CREATE TRIGGER TO academic_scale;

-- Tables will be created by connecting as academic_scale and running 01_schema.sql
