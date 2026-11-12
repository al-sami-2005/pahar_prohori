"""Load data/field_readings_7d.csv and refresh risk. Usage: python sensors/load_archive.py"""
from app.db import init_db
from app.refresh import refresh_all_hills


def main():
    init_db()
    refresh_all_hills()
    print("Archive loaded; status refreshed.")


if __name__ == "__main__":
    main()
