import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "edu_legacy.db"

RECORDS = [
    (
        "EDU/2022/00451",
        "PATIL RAHUL S",
        "14-05-2002",
        "9000000001",
        "DIEMS",
        "CSE",
        4,
        "A",
        "20-09-2026",
    ),
    (
        "EDU/2022/00452",
        "DESHMUKH SNEHA",
        "21-08-2002",
        "9000000002",
        "DIEMS",
        "CSE",
        4,
        "A",
        "20-09-2026",
    ),
]


def seed_database() -> None:
    connection = sqlite3.connect(DB_PATH)

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS STUD_MST (
            STUD_ID TEXT PRIMARY KEY,
            STUD_NM TEXT NOT NULL,
            DOB_STR TEXT NOT NULL,
            MOB_NO TEXT NOT NULL,
            INST_CD TEXT NOT NULL,
            COURSE_CD TEXT NOT NULL,
            YR_OF_STUDY INTEGER NOT NULL,
            ADM_STATUS TEXT NOT NULL,
            LAST_UPD TEXT
        )
        """
    )

    connection.executemany(
        """
        INSERT OR REPLACE INTO STUD_MST
        (
            STUD_ID, STUD_NM, DOB_STR, MOB_NO, INST_CD,
            COURSE_CD, YR_OF_STUDY, ADM_STATUS, LAST_UPD
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        RECORDS,
    )

    connection.commit()
    connection.close()


if __name__ == "__main__":
    seed_database()
    print("EDU legacy database seeded.")
