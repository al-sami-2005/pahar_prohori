"""
Load data/field_readings_7d.csv into the database and refresh hill risk status.

Usage:
    python sensors/build_field_archive.py
    python sensors/ingest_field_archive.py
"""
from app.db import init_db
from app.status_refresh import refresh_all_hills


def main():
    init_db()
    refresh_all_hills()
    print("Field archive loaded; hill status refreshed.")


if __name__ == "__main__":
    main()
