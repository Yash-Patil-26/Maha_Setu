from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.seed import write_edu_db


def test_edu_seed_creates_expected_legacy_source(tmp_path, monkeypatch) -> None:
    database = tmp_path / "edu_legacy.db"

    import scripts.seed as seed_module

    monkeypatch.setattr(seed_module, "EDU_DB_PATH", database)

    write_edu_db()

    assert database.exists()

    with sqlite3.connect(database) as connection:
        columns = [
            row[1]
            for row in connection.execute("PRAGMA table_info(STUD_MST)")
        ]

        row = connection.execute(
            """
            SELECT STUD_ID, STUD_NM, DOB_STR, MOB_NO, INST_CD,
                   COURSE_CD, YR_OF_STUDY, ADM_STATUS, LAST_UPD
            FROM STUD_MST
            WHERE MOB_NO = ? AND DOB_STR = ?
            """,
            ("7894561230", "23-12-2004"),
        ).fetchone()

    assert columns == [
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

    assert row == (
        "EDU/2026/00501",
        "BHAGWAT SHINDE",
        "23-12-2004",
        "7894561230",
        "PUN-ENG-016",
        "BTECH-CSE",
        3,
        "A",
        "02-10-2026",
    )
