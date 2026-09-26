import runpy
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "mock_systems" / "edu" / "edu_legacy.db"
SEED_PATH = Path(__file__).resolve().parents[2] / "mock_systems" / "edu" / "seed.py"

runpy.run_path(str(SEED_PATH), run_name="__main__")


def test_edu_schema():
    connection = sqlite3.connect(DB_PATH)
    columns = connection.execute("PRAGMA table_info(STUD_MST)").fetchall()
    connection.close()

    assert [column[1] for column in columns] == [
        "STUD_ID",
        "STUD_NM",
        "DOB_STR",
        "MOB_NO",
        "INST_CD",
        "COURSE_CD",
        "YR_OF_STUDY",
        "ADM_STATUS",
        "LAST_UPD",
    ]


def test_edu_lookup_by_mobile_and_dob():
    connection = sqlite3.connect(DB_PATH)

    row = connection.execute(
        """
        SELECT STUD_ID, STUD_NM, DOB_STR, MOB_NO, INST_CD,
               COURSE_CD, YR_OF_STUDY, ADM_STATUS, LAST_UPD
        FROM STUD_MST
        WHERE MOB_NO = ? AND DOB_STR = ?
        """,
        ("9000000001", "14-05-2002"),
    ).fetchone()

    connection.close()

    assert row == (
        "EDU/2022/00451",
        "PATIL RAHUL S",
        "14-05-2002",
        "9000000001",
        "DIEMS",
        "CSE",
        4,
        "A",
        "20-09-2026",
    )


def test_edu_lookup_no_match():
    connection = sqlite3.connect(DB_PATH)

    row = connection.execute(
        """
        SELECT STUD_ID
        FROM STUD_MST
        WHERE MOB_NO = ? AND DOB_STR = ?
        """,
        ("9999999999", "01-01-2000"),
    ).fetchone()

    connection.close()

    assert row is None


def test_edu_read_only_connection():
    uri = f"file:{DB_PATH.as_posix()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True)

    row = connection.execute(
        "SELECT COUNT(*) FROM STUD_MST"
    ).fetchone()

    connection.close()

    assert row[0] >= 2
