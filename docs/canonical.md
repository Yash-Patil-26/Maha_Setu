# SETU — Canonical Data Contract (`docs/canonical.md`) v1.0

Status: proposed by Claude under **CCN-001**, effective when Dev A approves and tags `contracts-v1`.
This file is the single definition of canonical entities. `backend/app/canonical/entities.json` must be generated from the tables below with **no added, renamed or dropped fields**.

## 1. Conventions

| Topic | Rule |
|---|---|
| Naming | `snake_case` field names, `UPPER_SNAKE` enum values |
| `date` | ISO-8601 `YYYY-MM-DD` (after mapping, always) |
| `datetime` | ISO-8601 UTC with `Z`, e.g. `2026-09-20T09:30:00Z` |
| `money_inr` | integer rupees, annual unless the field says otherwise |
| `mobile` | 10 digits, no `+91`, no spaces, regex `^[6-9][0-9]{9}$` |
| Strings | trimmed, Unicode NFC, no leading/trailing whitespace; max length as listed |
| Required | must be non-null after mapping; missing/invalid → `MAPPING_ERROR` naming the field |
| Optional | may be `null`; never an empty string (use `null`) |
| Stricter connectors | a connector's `validators` may be stricter than this contract, never looser |

## 2. Entities

### 2.1 `citizen` (hub-owned master profile; not fetched by connectors)
| Field | Type | Req | Rules |
|---|---|---|---|
| master_id | string | yes | `^SETU-CIT-[0-9]{6}$` |
| full_name | string | yes | 2–100 chars |
| dob | date | yes | not in the future |
| mobile | mobile | yes | see conventions |

### 2.2 `income_certificate` (source: REV)
| Field | Type | Req | Rules |
|---|---|---|---|
| cert_no | string | yes | 1–40 |
| holder_name | string | yes | 2–100 |
| annual_income_inr | integer (money_inr) | yes | 0–100000000 |
| issue_date | date | yes | not in the future |
| valid_until | date | yes | ≥ issue_date; `not_expired` rule applies |
| issuing_authority | string | no | ≤ 100 |

### 2.3 `caste_certificate` (source: REV)
| Field | Type | Req | Rules |
|---|---|---|---|
| cert_no | string | yes | 1–40 |
| holder_name | string | yes | 2–100 |
| category_code | enum | yes | `SC, ST, OBC, VJNT, SBC, OPEN` |
| issue_date | date | yes | not in the future |
| valid_until | date | no | `null` = no expiry; if present ≥ issue_date and `not_expired` applies |

### 2.4 `enrolment` (source: EDU)
| Field | Type | Req | Rules |
|---|---|---|---|
| enrolment_id | string | yes | 1–40 |
| student_name | string | yes | 2–100 |
| dob | date | yes | not in the future |
| institution_code | string | yes | 1–20 |
| institution_name | string | no | EDU has no name column, so usually `null` |
| course_code | string | yes | 1–20 |
| year_of_study | integer | yes | 1–6 |
| status | enum | yes | `ACTIVE, TERMINATED, DROPPED` |
| last_updated | date | no | |

### 2.5 `training_record` (source: SKL, onboarded live)
| Field | Type | Req | Rules |
|---|---|---|---|
| trainee_id | string | yes | 1–40 |
| trainee_name | string | yes | 2–100 |
| dob | date | yes | not in the future |
| course_code | string | yes | 1–20 |
| course_name | string | no | ≤ 100 |
| completion_status | enum | yes | `COMPLETED, IN_PROGRESS, DROPPED` |
| certificate_no | string | no | `null` unless completed; rule `youth_enterprise_v1` requires a value when `COMPLETED` |
| certificate_date | date | no | |

## 3. Runtime envelopes (not entities)

**Fetch result** (returned by every connector run):
`{ "entity": "income_certificate", "record": {…canonical fields…}, "source_system": "REV", "connector_id": 3, "external_id": "REV-1000004521", "fetched_at": "…Z", "correlation_id": "uuid", "warnings": [] }`

**Provenance** (golden record and application data card), keyed by `entity.field`:
`{ "income_certificate.annual_income_inr": { "value": 210000, "source_system": "REV", "fetched_at": "…Z" } }`

## 4. Consent key catalog

Consent artifacts store **keys**; enforcement releases only the listed fields. Everything else is dropped before storage or forwarding.

| Consent key | Released fields | Shown to citizen as |
|---|---|---|
| `identity_lookup` | citizen.full_name, citizen.dob, citizen.mobile | "Your name, date of birth and mobile, to find your records" |
| `income` | income_certificate.cert_no, holder_name, annual_income_inr, issue_date, valid_until | "Income certificate details" (issuing_authority is **not** released) |
| `caste_category` | caste_certificate.cert_no, holder_name, category_code, issue_date, valid_until | "Caste category" |
| `enrolment` | enrolment.enrolment_id, student_name, dob, institution_code, course_code, year_of_study, status | "Enrolment status" (institution_name and last_updated are **not** released) |
| `training` | training_record.trainee_id, trainee_name, dob, course_code, completion_status, certificate_no, certificate_date | "Skill training record" (course_name is **not** released) |

Journey consent steps: J1 `["identity_lookup","income","caste_category","enrolment"]`; J2 `["identity_lookup","income","training"]`.

## 5. Comparison rules (data quality)

- **DOB and mobile:** exact match on ISO date / 10 digits; DOB mismatch across sources → conflict.
- **Name normalization:** lowercase, remove punctuation, split into tokens, **drop single-letter tokens (initials)**.
- **Token match:** two tokens match if equal or `difflib.SequenceMatcher` ratio ≥ 0.85.
- **Name score** = (tokens of the shorter set that match a token in the longer set) ÷ (size of the shorter set). Score ≥ 0.85 → OK (log a warning if not identical); < 0.85 → `data_conflicts` row and application `NEEDS_REVIEW`.
- Examples: `PATIL RAHUL S` vs `Rahul Suresh Patil` → 1.0; `Aarti Jadhav` vs `JADHAV ARTI S` → 1.0 (warning); `Sneha Deshmukh` vs `Sneha Kulkarni` → 0.5 (conflict).

## 6. Transform semantics (mapping engine)

| Transform | Behaviour |
|---|---|
| `strip` | trim whitespace |
| `upper` / `lower` | case change |
| `title_case` | `PATIL RAHUL SURESH` → `Patil Rahul Suresh` |
| `to_int` | accepts `2,10,000`, `₹2,10,000`, `210000`, `210000.00`; non-zero fraction or non-numeric → `MAPPING_ERROR` |
| `to_float` | same tolerance, returns float |
| `{"date": "<strptime>"}` | parse with the given format, output ISO `YYYY-MM-DD`; invalid → `MAPPING_ERROR` |
| `{"enum": {...}}` | map source value → canonical value; unmapped → `MAPPING_ERROR` |
| `{"concat": [paths]}` | join with a single space |
| `split_name` | not used in P0 (reserved) |
| `{"default": v}` | use `v` when source is missing/empty |

## 7. Source → canonical mapping hints (contract between connector owner and mock-system owner)

| Source field | Canonical target | Transform |
|---|---|---|
| REV `./CertNo` | income_certificate.cert_no / caste_certificate.cert_no | strip |
| REV `./Holder/Name` | holder_name | strip, title_case |
| REV `./IncomeDetails/AnnualIncome` | annual_income_inr | to_int |
| REV `./CasteDetails/Category` | category_code | enum (must already be one of the six codes) |
| REV `./IssueDate`, `./ValidUntil` (DD/MM/YYYY; `ValidUntil` may be empty) | issue_date, valid_until | date `%d/%m/%Y` |
| REV `./IssuingAuthority` | issuing_authority | strip |
| EDU `STUD_ID` | enrolment_id | strip |
| EDU `STUD_NM` | student_name | strip, title_case |
| EDU `DOB_STR` (DD-MM-YYYY) | dob | date `%d-%m-%Y` |
| EDU `INST_CD`, `COURSE_CD` | institution_code, course_code | strip |
| EDU `YR_OF_STUDY` | year_of_study | to_int |
| EDU `ADM_STATUS` | status | enum `A→ACTIVE, T→TERMINATED, D→DROPPED` |
| EDU `LAST_UPD` (DD-MM-YYYY) | last_updated | date `%d-%m-%Y` |
| SKL `TRAINEE_ID` / `TRAINEE_NAME` | trainee_id / trainee_name | strip / strip, title_case |
| SKL `DOB` (DD-MM-YYYY) | dob | date `%d-%m-%Y` |
| SKL `COURSE_CODE` / `COURSE_NAME` | course_code / course_name | strip |
| SKL `COMPLETION` | completion_status | enum `Y→COMPLETED, N→IN_PROGRESS` |
| SKL `CERT_NO` / `CERT_DATE` (DD-MM-YYYY) | certificate_no / certificate_date | strip / date `%d-%m-%Y` (blank → null) |

## 8. Example (persona 1, Rahul Patil, all synthetic)

```json
{
  "citizen": {"master_id": "SETU-CIT-000001", "full_name": "Rahul Suresh Patil", "dob": "2004-03-04", "mobile": "9876543210"},
  "income_certificate": {"cert_no": "MH-INC-2026-000123", "holder_name": "Patil Rahul Suresh", "annual_income_inr": 210000,
    "issue_date": "2026-04-15", "valid_until": "2027-04-14", "issuing_authority": "Tahsildar, Haveli"},
  "caste_certificate": {"cert_no": "MH-CST-2024-004417", "holder_name": "Patil Rahul Suresh", "category_code": "OBC",
    "issue_date": "2024-08-02", "valid_until": null},
  "enrolment": {"enrolment_id": "EDU/2022/00451", "student_name": "Patil Rahul S", "dob": "2004-03-04", "institution_code": "PUN-ENG-014",
    "institution_name": null, "course_code": "BTECH-CSE", "year_of_study": 3, "status": "ACTIVE", "last_updated": "2026-07-10"}
}
```