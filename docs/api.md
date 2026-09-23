# SETU — API Contract (`docs/api.md`) v1.0

Status: proposed by Claude under **CCN-001**, effective when Dev A approves and tags `contracts-v1`. Endpoint names, roles and error codes follow handoff §11; anything new is marked **(new)**. Field names of canonical data come from `docs/canonical.md`.

## 1. Conventions

- Base URL `http://localhost:8000`. JSON only (except REV XML). CORS allows `http://localhost:5173`.
- Auth: `Authorization: Bearer <token>`. Hub access token: HS256, 8 h, claims `sub, role, master_id, name, exp`. SSO token: RS256, ≤ 5 min, claims `iss:"setu-hub", sub, aud, role, name, iat, exp`.
- IDs: integers for auto-increment tables; strings for `master_id`, `system_code`, `journey_id`, `bss_ref`; `correlation_id` is a UUID string. Timestamps ISO-8601 UTC `Z`.
- Lists: `?limit=50&offset=0` → `{"items":[…],"total":n,"limit":50,"offset":0}`.
- Errors (all endpoints): `{"error":{"code":"…","message":"human readable","correlation_id":"…","details":[{"field":"…","issue":"…"}]}}` (`details` optional).

| Code | HTTP | Meaning |
|---|---|---|
| AUTH_REQUIRED | 401 | missing/invalid token or credentials |
| FORBIDDEN | 403 | role or ownership not allowed |
| VALIDATION_ERROR | 400 | body/query invalid (also replaces FastAPI's default 422) |
| NOT_FOUND (new) | 404 | unknown id |
| STATE_CONFLICT (new) | 409 | action not allowed in current status |
| CONSENT_REQUIRED | 403 | no active consent for this action |
| CONSENT_REVOKED | 403 | consent revoked/expired |
| CONNECTOR_TIMEOUT | 504 | source did not answer within 5 s |
| CONNECTOR_ERROR | 502 | source returned an error |
| MAPPING_ERROR | 422 | source data could not be mapped/validated (names the field) |
| IDENTITY_NOT_FOUND | 404 | no record at the source |
| DATA_CONFLICT | 409 | cross-source mismatch |
| JOURNEY_PAUSED | 409 | application paused |
| SIGNATURE_INVALID (new) | 401 | webhook HMAC failed |

Enums: application `status` = `CREATED, IN_PROGRESS, BLOCKED_CONSENT, PAUSED_EXCEPTION, NEEDS_REVIEW, SUBMITTED, APPROVED, REJECTED, NOT_ELIGIBLE`. `sla_status` = `ON_TRACK, AT_RISK, BREACHED`. Step `status` = `PENDING, RUNNING, DONE, FAILED, WAITING, SKIPPED`. Connector `status` = `DRAFT, TESTED, ACTIVE`. Connector `kind` = `REST_JSON, REST_XML, SQL_VIEW, CSV`. System `health` = `UP, DOWN, DEGRADED`.

## 2. Shared shapes

```jsonc
// Application (list item)
{"id":12,"journey_id":"scholarship_v1","journey_version":1,"journey_name":"Post-Matric Scholarship (illustrative)",
 "master_id":"SETU-CIT-000001","status":"SUBMITTED","current_step":"await_decision","correlation_id":"uuid",
 "sla_status":"ON_TRACK","due_at":"…Z","created_at":"…Z","updated_at":"…Z","outcome":null}

// Step
{"step_id":"fetch_income","type":"fetch","status":"DONE","attempts":1,"started_at":"…Z","ended_at":"…Z",
 "system_code":"REV","format":"XML","duration_ms":312,"error_code":null,"error_detail":null,"output_summary":"income_certificate fetched"}

// ApplicationDetail = Application +
{"steps":[Step],
 "canonical":{"income_certificate":{…},"caste_certificate":{…},"enrolment":{…}},   // consented fields only
 "provenance":{"income_certificate.annual_income_inr":{"value":210000,"source_system":"REV","fetched_at":"…Z"}},
 "eligibility":{"eligible":true,"reasons":[{"code":"INCOME_LIMIT","message":"Income 2,10,000 ≤ 2,50,000","passed":true}]},
 "metrics":{"fields_total":14,"fields_autofilled":11,"citizen_typed":3,"systems_queried":3,"documents_not_uploaded":3},
 "conflicts":[Conflict],"external_refs":{"BSS":"BSS-2026-000045"},"grievances":[Grievance]}

// Consent
{"id":5,"master_id":"…","purpose":"scholarship_eligibility","journey_id":"scholarship_v1",
 "fields":["identity_lookup","income","caste_category","enrolment"],"source_systems":["REV","EDU"],
 "granted_at":"…Z","expires_at":"…Z","revoked_at":null,"status":"ACTIVE"}

// AccessLogEntry
{"id":31,"at":"…Z","system_code":"REV","purpose":"scholarship_eligibility",
 "fields":["income_certificate.annual_income_inr","income_certificate.issue_date"],"application_id":12,"outcome":"ALLOWED"}

// Conflict
{"id":4,"master_id":"…","application_id":12,"attribute":"dob","status":"OPEN",
 "values":[{"source_system":"REV","value":"2004-03-04"},{"source_system":"EDU","value":"2004-04-03"}],
 "resolution":null,"created_at":"…Z"}

// System
{"code":"REV","name":"Revenue Department – Certificates","owner_department":"Revenue & Forest","steward_contact":"…",
 "protocol":"XML over HTTP","id_scheme":"REV-<10 digits>","auth_type":"api_key","health":"UP","simulate_down":false}

// Connector (secrets never included; secret_ref is an env var NAME)
{"id":3,"system_code":"SKL","name":"skl_training","kind":"CSV","entity":"training_record",
 "config":{"file":"skills_registry.csv","delimiter":",","encoding":"utf-8-sig"},
 "lookup":{"mobile_field":"MOBILE","dob_field":"DOB","dob_format":"%d-%m-%Y"},"auth":{"type":"none"},
 "mapping":{…},"validators":[…],"status":"DRAFT","version":1,"created_at":"…Z","activated_at":null}

// JourneyDef
{"id":"youth_enterprise_v1","version":1,"name":"…","sla_hours":72,"status":"ACTIVE",
 "steps":[{"id":"fetch_training","type":"fetch","connector":"skl_training","configured":false}]}

// Notification / Grievance / AuditEvent
{"id":9,"title":"Application approved","body":"…","event_id":41,"read":false,"created_at":"…Z"}
{"id":2,"application_id":12,"text":"…","status":"OPEN","created_at":"…Z","resolved_at":null}
{"id":88,"ts":"…Z","actor":"officer1","action":"APPLICATION_RETRY","entity_type":"application","entity_id":"12","correlation_id":"…","detail":{…},"hash":null}
```

## 3. Hub endpoints

| Method | Path | Roles | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | public | `{username,password}` | 200 `{access_token,token_type:"bearer",expires_in,user:{id,username,role,display_name,master_id,locale}}` | 401 |
| POST | `/api/auth/sso-token` | officer, admin | `{audience:"bss"}` | 200 `{url,expires_in}` (`http://localhost:8002/sso?token=…`) | 400, 403 |
| POST | `/api/consents` | citizen | `{purpose,journey_id}` (purpose must equal the journey's consent purpose) | 201 Consent (`expires_at` = now + `CONSENT_TTL_DAYS`, default 30) | 400, 404 |
| POST | `/api/consents/{id}/revoke` | citizen (owner) | — | 200 Consent (`REVOKED`); emits event `consent.revoked` | 403, 404 |
| POST | `/api/applications` | citizen | `{journey_id}` | 202 `{application_id,status:"CREATED",correlation_id}` | 403 `CONSENT_REQUIRED`, 404 |
| POST | `/api/applications/{id}/retry` | officer, admin; **citizen (own) only when `BLOCKED_CONSENT` (new)** | — | 202 `{application_id,status:"IN_PROGRESS"}` | 403, 409 `STATE_CONFLICT` |
| POST | `/api/applications/{id}/grievances` | citizen (owner) | `{text}` 1–500 chars | 201 Grievance | 400, 403 |
| POST | `/api/conflicts/{id}/resolve` | officer | exactly one of `{chosen_source_system}` or `{value}` | 200 Conflict (`RESOLVED`); updates golden record + provenance; resumes the application | 400, 409 |
| POST | `/api/notifications/{id}/read` | any (owner) | — | 200 Notification | 404 |
| POST | `/api/systems/{code}/simulate-outage` | admin | `{down:boolean}` (REV, EDU only) | 200 System | 400, 404 |
| POST | `/api/connectors` | admin | `{system_code,name,kind,entity,config,lookup,auth}` (starts an onboarding session) | 201 Connector (`DRAFT`) | 400 |
| POST | `/api/connectors/{id}/sample` | admin | `{identity_sample?:{mobile,dob}}` (`dob` ISO; formatted per `lookup.dob_format`) | 200 `{raw,fields:[{path,sample,inferred_type}],duration_ms}` | 400, 502, 504 |
| POST | `/api/connectors/{id}/suggest-mapping` | admin | — | 200 `{mapping}` (deterministic: name similarity + type inference; no AI) | 400 |
| PUT | `/api/connectors/{id}/mapping` | admin | `{mapping,validators}` | 200 Connector (still `DRAFT`) | 400 |
| POST | `/api/connectors/{id}/test` | admin | `{mapping?,identity_sample}` | 200 `{canonical,validation:[{field,rule,passed,message}],duration_ms}`; status → `TESTED` if all validators pass | 400, 422, 502, 504 |
| POST | `/api/connectors/{id}/activate` | admin | `{journey_id,step_id}` (connector `name` must equal the step's `connector` reference) | 200 `{connector,onboarding_seconds,journey_version}` (status `ACTIVE`, session closed) | 400, 409 (must be `TESTED`) |

## 4. Inbound webhook (BSS → hub)

`POST /webhooks/{system_code}` (public route, signed). Header `X-Signature: sha256=<hex HMAC-SHA256 of the raw body>` using env secret `WEBHOOK_HMAC_SECRET_<CODE>` (e.g. `_BSS`). Body (CloudEvents-style):
```json
{"specversion":"1.0","id":"evt-7f3a","source":"bss","type":"bss.application.decided",
 "subject":"BSS-2026-000045","time":"2026-09-21T10:15:00Z","data":{"decision":"APPROVED","remarks":"Verified"}}
```
`decision` ∈ `APPROVED | REJECTED`. Response 202 `{"status":"accepted"}`; duplicate event `id` → 200 `{"status":"duplicate"}` (idempotent); bad signature → 401 `SIGNATURE_INVALID`. The hub finds the application via `external_refs.BSS == subject`, resumes its `WAITING` step, sets `APPROVED`/`REJECTED`, creates a notification.

## 5. External mock-system contracts (owner: Dev C builds, Dev B consumes)

### 5.1 REV — Revenue certificates (XML over HTTP, port 8001)
`GET /certificates?type=INCOME|CASTE&mobile=9876543210&dob=04/03/2004` — header `X-API-Key: <REV_API_KEY>`. Missing/wrong key → 401. No match → 404 with `<CertificateResponse><Status>NOT_FOUND</Status></CertificateResponse>`. Outage toggle → 503. `type` is required; `dob` is `DD/MM/YYYY`.
```xml
<CertificateResponse>
  <Status>OK</Status>
  <Certificate type="INCOME">
    <CertNo>MH-INC-2026-000123</CertNo>
    <ApplicantRef>REV-1000004521</ApplicantRef>
    <Holder><Name>PATIL RAHUL SURESH</Name><DOB>04/03/2004</DOB><Mobile>9876543210</Mobile></Holder>
    <IncomeDetails><AnnualIncome>2,10,000</AnnualIncome><Currency>INR</Currency></IncomeDetails>
    <IssueDate>15/04/2026</IssueDate><ValidUntil>14/04/2027</ValidUntil>
    <IssuingAuthority>Tahsildar, Haveli</IssuingAuthority>
  </Certificate>
</CertificateResponse>
```
CASTE variant: same envelope, `<Certificate type="CASTE">` with `<CasteDetails><Category>OBC</Category><CasteName>Kunbi</CasteName></CasteDetails>` instead of `IncomeDetails`; `<ValidUntil/>` is empty when there is no expiry. Connector `record_path` = `./Certificate`.

### 5.2 EDU — legacy Education database (no API), file `mock_systems/edu/edu_legacy.db`
```sql
CREATE TABLE STUD_MST (
  STUD_ID TEXT PRIMARY KEY,      -- EDU/2022/00451
  STUD_NM TEXT NOT NULL,         -- UPPERCASE, surname first: 'PATIL RAHUL S'
  DOB_STR TEXT NOT NULL,         -- DD-MM-YYYY
  MOB_NO TEXT NOT NULL,          -- 10 digits
  INST_CD TEXT NOT NULL, COURSE_CD TEXT NOT NULL,
  YR_OF_STUDY INTEGER NOT NULL,
  ADM_STATUS TEXT NOT NULL,      -- A | T | D
  LAST_UPD TEXT                  -- DD-MM-YYYY
);
```
Connector query: `SELECT STUD_ID, STUD_NM, DOB_STR, INST_CD, COURSE_CD, YR_OF_STUDY, ADM_STATUS, LAST_UPD FROM STUD_MST WHERE MOB_NO = :mobile AND DOB_STR = :dob` over a read-only connection (`dob` formatted `DD-MM-YYYY`). Outage toggle simulates a locked database.

### 5.3 BSS — Benefit Scheme System (REST/JSON, port 8002)
- `POST /api/schemes/{scheme_code}/applications` — header `Authorization: Bearer <BSS_API_TOKEN>`, header `Idempotency-Key: <application_id>:<step_id>`. Body `{"applicant":{"master_id","full_name","dob","mobile"},"scheme_code":"SCHOL-PM","data":{…consented canonical fields…},"correlation_id":"uuid"}` → 201 `{"bss_ref":"BSS-2026-000045","status":"RECEIVED"}`; same idempotency key → 200 with the same body; 401 bad token.
- `GET /api/applications/{bss_ref}` → `{"bss_ref","status":"RECEIVED|APPROVED|REJECTED","remarks":null}`.
- Own officer page `/officer` (local login form **and** `/sso?token=` accepted after verifying RS256 against the hub JWKS, `aud` must be `bss`). Approve/Reject sends the signed webhook in §4. Scheme codes: `SCHOL-PM` (J1), `STARTUP-YOUTH` (J2).

### 5.4 SKL — Skills & Employment registry (CSV, no server)
File `data_drop/skills_registry.csv`, UTF-8 with BOM (`utf-8-sig`), comma-delimited, header row:
`TRAINEE_ID,TRAINEE_NAME,DOB,MOBILE,COURSE_CODE,COURSE_NAME,COMPLETION,CERT_NO,CERT_DATE`
Example row: `SKL-2023-8841,PAWAR SURESH A,12-11-2002,9822012345,ELEC-101,Electrical Technician,Y,SKL-CERT-55102,20-06-2026`. `DOB` and `CERT_DATE` are `DD-MM-YYYY`; `COMPLETION` is `Y`/`N`. **No connector exists for SKL at start.**
