#!/usr/bin/env python3
"""
Seed Remote Neo4j (e.g. Neo4j AuraDB) from CSV datasets.
Usage:
  python scripts/seed_remote_neo4j.py
  python scripts/seed_remote_neo4j.py --uri neo4j+s://xxxx.databases.neo4j.io --password your-aura-password
"""

import argparse
import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.config import settings
import app.db_neo4j as db_neo4j
from app.services.reset_service import reset_neo4j_database


def main():
    parser = argparse.ArgumentParser(description="Populate Neo4j instance with Conference Graph demo data.")
    parser.add_argument("--uri", help="Neo4j Bolt/Aura URI (e.g. neo4j+s://xxxx.databases.neo4j.io)")
    parser.add_argument("--user", default="neo4j", help="Neo4j username (default: neo4j)")
    parser.add_argument("--password", help="Neo4j password")
    parser.add_argument("--database", default="neo4j", help="Neo4j database name (default: neo4j)")
    args = parser.parse_args()

    # Override settings if arguments are provided
    if args.uri:
        settings.NEO4J_URI = args.uri
    if args.user:
        settings.NEO4J_USER = args.user
    if args.password:
        settings.NEO4J_PASSWORD = args.password
    if args.database:
        settings.NEO4J_DATABASE = args.database

    print(f"Connecting to Neo4j at: {settings.NEO4J_URI} (user: {settings.NEO4J_USER}, db: {settings.NEO4J_DATABASE})")

    # Reset any existing driver instance to pick up new connection settings
    db_neo4j._driver = None

    try:
        driver = db_neo4j.get_driver()
        driver.verify_connectivity()
        print("Successfully connected and verified Neo4j credentials.")
    except Exception as e:
        print(f"Failed to connect to Neo4j: {e}", file=sys.stderr)
        sys.exit(1)

    print("Beginning database wipe and batch UNWIND reload from data/ CSVs...")
    try:
        result = reset_neo4j_database(database=settings.NEO4J_DATABASE)
        print("\n=== Neo4j Seeding Succeeded ===")
        print(f"Elapsed time: {result['elapsed_ms']:.2f} ms")
        print(f"Total Nodes: {result.get('nodes', 0)}")
        print(f"Total Relationships: {result.get('relationships', 0)}")
        print(f"SAME_PERSON_AS edges: {result.get('same_person_as', 0)}")
    except Exception as e:
        print(f"\nSeeding failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db_neo4j.close_neo4j_driver()


if __name__ == "__main__":
    main()
