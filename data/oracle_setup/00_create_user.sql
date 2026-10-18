-- Run ONCE as SYSTEM, connected to the pluggable database FREEPDB1 (NOT the container CDB$ROOT):
--   sqlplus system@localhost:1521/FREEPDB1
--   SQL> @00_create_user.sql
SHOW CON_NAME
-- must print FREEPDB1. If it prints CDB$ROOT, stop and reconnect with the /FREEPDB1 service name.

CREATE USER academic IDENTIFIED BY "123456" QUOTA UNLIMITED ON USERS;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW,
      CREATE PROCEDURE, CREATE TRIGGER TO academic;
