# SETU (SetuFlow) — Engineering Handoff for ChatGPT

Version 1.0 · 19 Sep 2026 · Author: Senior Technical Authority (Claude) · Approved by team: fresh repo, stack lock, thesis, freeze/cut order.
Audience: ChatGPT (implementation authority) + 4 student developers on Windows.
Rule zero: **this document is the contract.** If something here is wrong, unclear or impossible, say so and propose a change (see §23). Do not silently redesign.

---

## 1. Project identity

| Item | Value |
|---|---|
| Name | SETU (working title SetuFlow). Repo: `setu` |
| Event | Smart India Hackathon 2026, idea-submission round |
| Team | 6 members: 4 coders (Dev A integrator/main dev, Dev B deputy, Dev C, Dev D) + 2 non-coders (research/QA/PPT/video) |
| Deliverables | (1) MVP running on a Windows laptop with one command, (2) demo video ≤ ~3:40, (3) 6-slide PDF idea deck |
| Dates | Today Sat 19 Sep. **Freeze Fri 25 Sep 12:00.** Video/PPT finish Sat 26–Sun 27. Submit Mon 28. Hard deadline Wed 30 Sep |
| Thesis | **Connect a legacy department system in minutes, with no rip-and-replace, and prove what it saved.** |
| Three pillars | (1) Connector-as-configuration (Onboarding Studio) (2) Consent-first exchange with citizen-visible access log (3) Measured once-only impact |

## 2. Problem Statement (verbatim, sole constraint source) and traceability

**Problem Statement ID:** 26129
**Title:** System integration and interoperability among government digital platforms, resulting in fragmented service delivery
**Organization:** Government of Maharashtra · **Department:** Maharashtra State Innovation Society, Department of Skills, Employment, Entrepreneurship and Innovation · **Category:** Software

**Problem Description:** Government departments operate multiple portals, mobile applications, registries, workflow systems and databases that have often been developed independently. Differences in data formats, identifiers, authentication methods, APIs, process definitions and ownership structures can prevent seamless information exchange. Citizens and businesses may be required to submit the same information repeatedly, track applications across different portals, or visit multiple offices. Officials may lack a consolidated view of beneficiaries, applications, approvals, grievances and service outcomes. The challenge is to enable secure, standards-based interoperability without requiring complete replacement of existing systems.

**Expected Solution / Outcome:** An interoperability framework, middleware layer or federated service delivery architecture that supports API based exchange, common data standards, master-data management, consent-based data sharing, single sign on or federated identity, event-driven notifications, unified application tracking and configurable workflow orchestration. The solution should provide reusable connectors for legacy and modern systems, audit logs, role-based access, data-quality checks, exception handling and monitoring dashboards. Expected outcomes include fewer duplicate submissions, reduced processing time, consistent records, improved citizen experience, better cross-department coordination, and measurable improvement in service-level compliance.

### Traceability (every clause must be visible in the demo)

| PS clause | Where it lives in SETU | Video scene | Tickets |
|---|---|---|---|
| Different data formats | 4 systems: XML (REV), JSON (BSS), legacy SQL DB (EDU), CSV (SKL) → one canonical model | S2, S5 | T-030..T-034 |
| Different identifiers | Each system has its own ID scheme; hub crosswalk links master ID ↔ external IDs | S2 | T-040 |
| Different authentication methods | REV = API key, BSS = webhook HMAC + SSO token, EDU/SKL = local access; connector `auth` types | S5 | T-036 |
| Different APIs / process definitions / ownership | System Registry (owner dept, steward, protocol, ID scheme) + declarative journey definitions | S2, S5 | T-094, T-060 |
| Repeated submissions | Once-only meter (fields/documents the citizen did not re-enter) | S2, S7 | T-095 |
| Tracking across portals | Single application timeline across systems | S2, S3 | T-092 |
| Officials' consolidated view (beneficiaries, applications, approvals, grievances, outcomes) | Officer dashboard: queue, beneficiaries list, decisions, grievances, outcome counts | S3, S4 | T-093 |
| API-based exchange | Connector runtime (REST/XML/SQL/CSV) | S2 | T-030..033 |
| Common data standards | Versioned canonical entities, ISO-8601 dates, CloudEvents-style event envelope | S2 | T-003, T-070 |
| Master-data management | Golden citizen record + field provenance + survivorship + conflict queue | S2, S6 | T-041, T-042 |
| Consent-based sharing | Consent artifacts (purpose, fields, expiry, revoke) enforced at hub; access log | S2, S6 | T-050..T-052 |
| SSO / federated identity | Hub issues RS256 JWT, publishes JWKS; BSS portal accepts it (one login, two apps) | S3 | T-011 |
| Event-driven notifications | Outbox + inbound webhook + in-app notifications | S3 | T-070..T-072 |
| Unified application tracking | Timeline + status + SLA | S2–S4 | T-092 |
| Configurable workflow orchestration | JSON journey definitions; Studio attaches a new connector to a journey | S5 | T-060..T-063, T-082 |
| Reusable connectors legacy + modern | 4 connector kinds + Onboarding Studio | S5 | T-030..T-036, T-080..T-083 |
| Audit logs / RBAC / data-quality / exception handling / monitoring | Audit table, roles, validators + conflicts, retry/resume, admin dashboard | S4, S6, S7 | T-010, T-035, T-062, T-073, T-094 |
| Outcomes: fewer duplicates, less time, consistent records, better experience, coordination, SLA | Metrics dashboard (measured in prototype, labelled) | S7 | T-064, T-095 |
| No complete replacement | Read-only adapters; legacy systems keep working untouched | S5 | all connectors |

## 3. Problem, users, objectives

- **Root problem:** departmental systems can't exchange data (formats, IDs, auth, APIs), so citizens re-enter data, chase status across portals, and officials lack one view. Onboarding a legacy system that has *no API* is the unsolved step (DigiLocker issuers must host APIs; API Setu assumes APIs exist).
- **Users:** Citizen (applicant, incl. young entrepreneur for J2), Department Officer (BSS/scheme desk), SETU Admin (integration owner). Businesses/entrepreneurs are covered by J2.
- **Objectives (measurable in the prototype):** (a) citizen types ≤ 3 fields for a full scholarship application, (b) onboard a new legacy source in < 3 minutes with 0 code changes, (c) 100% of cross-system reads consent-checked and audited, (d) failed dependency pauses and resumes without data loss, (e) SLA status visible per application.

## 4. Research conclusions that matter for implementation

Verified (Sep 2026):
- API Setu: consumers subscribe and get access after publisher approval; DigiLocker document access via MeriPehchaan is consent-based; issuer onboarding requires hosting APIs and audit before go-live. → SETU's gap: an on-ramp for systems without APIs.
- MeriPehchaan requester spec carries `purpose` and consent-validity parameters → model consent artifacts the same way.
- Maha AI / MahaDBT 2.0 / MahaSarathi announced June 2026 (integrated database to identify eligible beneficiaries, reduce duplication) → we do **not** pitch a statewide master database; we pitch the connector/orchestration layer that feeds such platforms.
- Public competing builds for this PS exist (a scholarship-safety pipeline with consent revocation/replay/idempotency; a Spring Boot + Keycloak + Camunda platform with REST/SOAP/CSV adapters). Table stakes now: multi-format adapters, consent + revocation, workflow with recovery, audit, role-based views. **Our differentiators:** runtime no-code onboarding, citizen access log, measured impact.
- Official 2025 evaluation criteria: novelty, complexity, clarity/detail in prescribed format, feasibility, practicability, sustainability, scale of impact, user experience, potential for future progression.

Assumptions (label in deck): real Maharashtra systems' internals are not public; all systems here are synthetic, modelled on plausible legacy patterns; thresholds are illustrative.

## 5. Requirements and scope

**P0 (must build)**
- FR-01 Login + roles (citizen/officer/admin), JWT.
- FR-02 SSO: hub issues RS256 JWT + JWKS; BSS portal accepts hub token (no second login).
- FR-03 Four synthetic systems: REV (XML over HTTP, API key), EDU (legacy SQL DB, no API), BSS (REST/JSON + own officer page + signed webhook), SKL (CSV in `data_drop/`, onboarded live).
- FR-04 Connector runtime: REST_JSON, REST_XML, SQL_VIEW, CSV; declarative mapping + transforms + validators; auth types none/api_key/basic/bearer.
- FR-05 Identity crosswalk (mobile+DOB deterministic link) and golden record with provenance; conflict detection + officer resolution.
- FR-06 Journey engine: declarative JSON definitions, correlation IDs, persisted step state, retry with backoff, pause/resume, explainable eligibility.
- FR-07 Consent: artifact (purpose, fields, expiry), enforced per fetch with field filtering, revoke blocks next call, citizen access log.
- FR-08 Events: outbox + dispatcher, inbound signed webhook resumes journeys, in-app notifications; audit log for every state change.
- FR-09 Views: citizen (services, apply, timeline, data card, consents, access log, profile, notifications), officer (queue, conflicts, retry, decisions, grievances, beneficiaries), admin (systems registry, health, outage toggle, audit, metrics, Studio).
- FR-10 Onboarding Studio: connect → sample → suggested mapping → validate/test → activate → attach to journey; onboarding timer.
- FR-11 Metrics: once-only meter, onboarding time, connector success rate/latency, SLA status (live + labelled simulated history).
- FR-12 Minimal grievance: citizen raises grievance on an application; officer sees it linked.
- FR-13 One-command run, seed/reset script, smoke test, CI.

**P1 (if time; cut in this order, top first):** Marathi UI toggle → hash-chained audit → fuzzy name candidates + review UI → server-sent events instead of polling → journey definition viewer → CloudEvents strictness.
**P2/Future (slides only):** sidecar packaging, real API Setu/DigiLocker/MeriPehchaan adapters, DPDP consent-manager integration, Kubernetes, message broker, LLM mapping suggestions (human-confirmed), offline mode.
**Discarded:** Kafka, Keycloak, Kubernetes, Camunda, Celery/Redis, ZKP, blockchain, LLMs in P0, Docker (Windows time sink), microservices, WebSockets.

## 6. Non-negotiable constraints

1. Windows-first (PowerShell). Everything runs with `python run_all.py`. No Docker, no bash-only tooling.
2. Modular monolith hub; mock systems are separate processes/files. SQLite (WAL). React + Vite + FastAPI.
3. All data synthetic; label "Synthetic data" in UI footer and video. Never claim real integrations, compliance, AI, or "first/only".
4. Contracts in `docs/` (canonical, API) are frozen after Day 1 except via §23 change note.
5. No secrets in Git. `.env.example` only.
6. Every feature must appear in the demo storyboard or be cut.
7. Readable code for beginner–intermediate developers: no metaprogramming, no clever abstractions.

## 7. Architecture

```
React (citizen | officer | admin+Studio)  ──REST/JSON (JWT)──▶  FastAPI Hub (modular monolith, :8000)
   ├─ auth/RBAC + JWKS/SSO      ├─ consent + access log     ├─ journey engine (JSON defs, retry/resume, SLA)
   ├─ connector runtime + mapping engine + validators (REST_JSON | REST_XML | SQL_VIEW | CSV)
   ├─ identity crosswalk + golden record + conflicts        ├─ events/outbox + webhooks + notifications
   └─ audit + metrics
              │ adapters (read-only)                          ▲ signed webhook
   REV (XML, :8001)   EDU (legacy SQL DB file)   BSS (REST+officer page, :8002)   SKL (CSV in data_drop/)
```
Ports: hub 8000 · REV 8001 · BSS 8002 · frontend 5173.
Adapters are in-process now; the connector interface is sidecar-ready (roadmap slide).

## 8. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Python | 3.12 (pinned on all laptops via `py -3.12`) | 3.14 is too new for some wheels |
| Backend | FastAPI, SQLAlchemy 2.x, Pydantic v2, httpx, PyJWT + cryptography (RS256), bcrypt (direct, no passlib), defusedxml, pytest, ruff | Pin exact versions at project start (`pip freeze`) |
| DB | SQLite, WAL, `busy_timeout`, `check_same_thread=False`; seed via `scripts/seed.py --reset` | DB files never committed |
| Frontend | React 19, Vite, React Router, TanStack Query (polling 3 s), Recharts, plain CSS with design tokens | JS, not TypeScript |
| Run | `run_all.py` launches hub, REV, BSS, frontend with `subprocess` | cross-platform, no make |
| CI | GitHub Actions on `windows-latest`: ruff, pytest, `npm ci && npm run build` | |

Windows rules: use `pathlib`; `.gitattributes` = `* text=auto eol=lf`; if venv activation is blocked run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`; no symlinks; no `uvloop`; avoid `--reload` in `run_all.py`; Node LTS installer.

## 9. Data model (SQLAlchemy models; SQLite)

| Table | Key columns |
|---|---|
| users | id, username, password_hash, role (citizen/officer/admin), master_id (nullable), display_name, locale |
| master_citizens | master_id (`SETU-CIT-000001`), full_name, dob (ISO), mobile (10 digits), golden_json, provenance_json, created_at |
| identity_links | id, master_id, system_code, external_id, method (`mobile_dob`/`manual`), confidence, status; unique(master_id, system_code) |
| data_conflicts | id, master_id, attribute, values_json (per source), status (OPEN/RESOLVED), resolution_json, resolved_by, created_at |
| systems | code (PK: REV/EDU/BSS/SKL), name, owner_department, steward_contact, protocol, id_scheme, auth_type, health (UP/DOWN/DEGRADED), simulate_down |
| connectors | id, system_code, name, kind (REST_JSON/REST_XML/SQL_VIEW/CSV), entity, config_json, lookup_json, mapping_json, validators_json, status (DRAFT/TESTED/ACTIVE), version, created_at, activated_at |
| connector_calls | id, connector_id, correlation_id, started_at, duration_ms, status, error_code, http_status |
| onboarding_sessions | id, connector_id, admin_id, started_at, activated_at, code_changes (default 0) |
| journey_defs | id, version, name, definition_json, status |
| applications | id, journey_id, journey_version, master_id, status, current_step, correlation_id, due_at, created_at, updated_at, decided_at, outcome, canonical_json, external_refs_json, metrics_json |
| application_steps | id, application_id, step_id, status (PENDING/RUNNING/DONE/FAILED/WAITING/SKIPPED), attempts, started_at, ended_at, error_code, error_detail, output_json |
| consents | id, master_id, purpose, fields_json, source_systems_json, granted_at, expires_at, revoked_at, status (ACTIVE/REVOKED/EXPIRED) |
| access_log | id, master_id, system_code, purpose, fields_json, at, application_id, outcome (ALLOWED/DENIED) |
| events | id, type, source, subject, correlation_id, data_json, status (PENDING/DELIVERED/FAILED/DEAD), attempts, next_attempt_at, created_at |
| notifications | id, master_id or user_id, title, body, event_id, read, created_at |
| audit_events | id, ts, actor, action, entity_type, entity_id, correlation_id, detail_json, prev_hash, hash |
| grievances | id, application_id, master_id, text, status (OPEN/RESOLVED), created_at, resolved_at |

Application status enum: `CREATED, IN_PROGRESS, BLOCKED_CONSENT, PAUSED_EXCEPTION, NEEDS_REVIEW, SUBMITTED, APPROVED, REJECTED, NOT_ELIGIBLE`.
Error codes: `AUTH_REQUIRED, FORBIDDEN, VALIDATION_ERROR, CONSENT_REQUIRED, CONSENT_REVOKED, CONNECTOR_TIMEOUT, CONNECTOR_ERROR, MAPPING_ERROR, IDENTITY_NOT_FOUND, DATA_CONFLICT, JOURNEY_PAUSED`.
Error body: `{"error":{"code":"...","message":"...","correlation_id":"..."}}`.

## 10. Contracts

### 10.1 Canonical entities (`docs/canonical.md`, `backend/app/canonical/entities.json`)
- `citizen`: master_id, full_name, dob (ISO), mobile.
- `income_certificate`: cert_no, holder_name, annual_income_inr (int), issue_date, valid_until, issuing_authority.
- `caste_certificate`: cert_no, holder_name, category_code (SC/ST/OBC/VJNT/SBC/OPEN), issue_date, valid_until.
- `enrolment`: enrolment_id, student_name, dob, institution_code, institution_name, course_code, year_of_study, status (ACTIVE/TERMINATED/DROPPED), last_updated.
- `training_record`: trainee_id, trainee_name, dob, course_code, course_name, completion_status (COMPLETED/IN_PROGRESS/DROPPED), certificate_no, certificate_date.
Each field: name, type, required, description (Studio renders targets from this file). Dates always ISO-8601 after mapping. Money in INR integers, annual.

### 10.2 Mapping DSL
```json
{"entity":"training_record","record_path":null,
 "fields":[
  {"target":"trainee_id","source":"TRAINEE_ID","transforms":["strip"]},
  {"target":"trainee_name","source":"TRAINEE_NAME","transforms":["strip","title_case"]},
  {"target":"dob","source":"DOB","transforms":[{"date":"%d-%m-%Y"}]},
  {"target":"completion_status","source":"COMPLETION","transforms":[{"enum":{"Y":"COMPLETED","N":"IN_PROGRESS"}}]}],
 "validators":[{"field":"certificate_no","rule":"required"},{"field":"dob","rule":"date_not_future"}]}
```
Source paths: JSON dotted (`a.b[0].c`); XML ElementTree XPath subset (`./Holder/Name`, `@attr`); SQL/CSV column names.
Transforms: `strip, upper, lower, title_case, to_int, to_float, {date:fmt}, {enum:map}, {concat:[paths]}, split_name, default(v)`.
Validators: `required, type, regex, range(min,max), allowed, date_not_future, not_expired(field)`.

### 10.3 Connector config
```json
{"system_code":"SKL","kind":"CSV","entity":"training_record",
 "config":{"file":"skills_registry.csv","delimiter":",","encoding":"utf-8-sig"},
 "lookup":{"mobile_field":"MOBILE","dob_field":"DOB","dob_format":"%d-%m-%Y"},
 "auth":{"type":"none"}}
```
REST: `config:{url,method,params,timeout_s:5}`, `lookup:{mobile_param,dob_param,dob_format}`, `auth:{type:"api_key",header:"X-API-Key",secret_ref:"REV_API_KEY"}`.
SQL_VIEW: `config:{db_url_ref:"EDU_DB_URL",query:"SELECT ... WHERE MOB_NO=:mobile AND DOB_STR=:dob"}`; read-only connection; query must be a single SELECT (reject `;` and non-SELECT).
CSV: only files inside `data_drop/` (block path traversal).
Secrets are env var *names* (`secret_ref`), never stored values.

### 10.4 Journey definition
```json
{"id":"scholarship_v1","name":"Post-Matric Scholarship (illustrative)","sla_hours":72,"steps":[
 {"id":"consent","type":"consent","purpose":"scholarship_eligibility","fields":["income","caste_category","enrolment"]},
 {"id":"fetch_income","type":"fetch","connector":"rev_income"},
 {"id":"fetch_caste","type":"fetch","connector":"rev_caste"},
 {"id":"fetch_enrolment","type":"fetch","connector":"edu_enrolment"},
 {"id":"validate","type":"validate"},
 {"id":"decide","type":"rule","rule":"scholarship_v1"},
 {"id":"submit","type":"push","connector":"bss_submit","scheme_code":"SCHOL-PM"},
 {"id":"await_decision","type":"wait_event","event":"bss.application.decided","sla_hours":48}]}
```
Step types: `consent, fetch, validate, rule, push, wait_event, notify`.
**J2 `youth_enterprise_v1`:** consent → fetch_income (rev_income) → fetch_training (`skl_training`, *unconfigured until live onboarding; UI shows "connector not configured"*) → validate → decide (`youth_enterprise_v1`) → submit (BSS, `STARTUP-YOUTH`) → await_decision.
Rules live in Python (`services/rules.py`), thresholds in `rules_config.json` (illustrative): scholarship = enrolment ACTIVE + category in allowed set + income ≤ ₹2,50,000 + certificates not expired; youth_enterprise = income ≤ ₹8,00,000 + training COMPLETED. Rules return `{eligible, reasons:[{code,message,passed}]}`.

## 11. APIs (JWT bearer unless noted; roles in brackets)

Important endpoints in full:

| METHOD | ENDPOINT | PURPOSE | REQUEST | VALIDATION / PROCESSING | DB / SERVICE ACTION | RESPONSE |
|---|---|---|---|---|---|---|
| POST | `/api/auth/login` (public) | Login | `{username,password}` | bcrypt check | read users; audit LOGIN | `{access_token, role, display_name}` |
| POST | `/api/auth/sso-token` [officer,admin] | Token for dept portal | `{audience:"bss"}` | role check; sign RS256 (exp ≤ 5 min) | audit SSO_ISSUED | `{url}` (BSS `/sso?token=`) |
| GET | `/.well-known/jwks.json` (public) | Public key for token verification | — | — | — | JWKS |
| POST | `/api/consents` [citizen] | Grant consent | `{purpose, journey_id}` | purpose must match journey; fields from journey step | insert consent ACTIVE; audit | consent |
| POST | `/api/consents/{id}/revoke` [citizen] | Revoke | — | owner only | set REVOKED; audit; event `consent.revoked` | consent |
| POST | `/api/applications` [citizen] | Start journey | `{journey_id}` | active consent exists (else `CONSENT_REQUIRED`); journey ACTIVE | insert application+steps; enqueue engine | 202 `{application_id,status,correlation_id}` |
| GET | `/api/applications/{id}` [owner/officer/admin] | Detail | — | scope check | join steps, canonical, provenance, SLA, metrics | full detail |
| POST | `/api/applications/{id}/retry` [officer,admin] | Resume paused | — | status must be PAUSED_EXCEPTION/BLOCKED_CONSENT | reset failed step; enqueue; audit | 202 |
| POST | `/api/conflicts/{id}/resolve` [officer] | Resolve data conflict | `{chosen_source|value}` | conflict OPEN | update golden record+provenance; resume app; audit | conflict |
| POST | `/api/connectors/{id}/sample` [admin] | Fetch raw sample | `{identity_sample?}` | connector config valid; SELECT-only; CSV in data_drop | run connector raw; flatten fields | `{raw, fields:[{path,sample,inferred_type}]}` |
| POST | `/api/connectors/{id}/suggest-mapping` [admin] | Suggest mapping | — | deterministic: normalized name similarity + type inference | no AI | mapping draft |
| POST | `/api/connectors/{id}/test` [admin] | Dry-run | `{mapping, identity_sample}` | mapping schema; validators | run + map + validate (no persistence except call log) | `{canonical, validation:[...], duration_ms}` |
| POST | `/api/connectors/{id}/activate` [admin] | Go live | `{journey_id, step_id}` | status TESTED | set ACTIVE; attach to journey step; close onboarding session; audit | connector + `onboarding_seconds` |
| POST | `/webhooks/{system_code}` (HMAC) | Inbound event | CloudEvents-style JSON, `X-Signature: sha256=<hmac>` | verify signature; dedupe by event id | insert event; engine resumes matching WAITING step | 202 |

Other endpoints (short):
`GET /api/auth/me` · `GET /api/me/profile` (golden record+provenance+conflicts) · `GET /api/consents` · `GET /api/access-log` · `GET /api/journeys`, `/api/journeys/{id}` · `GET /api/applications` (role-scoped) · `POST /api/applications/{id}/grievances` · `GET /api/grievances` [officer] · `GET /api/officer/queue` (PAUSED/NEEDS_REVIEW/AT_RISK) · `GET /api/notifications`, `POST /api/notifications/{id}/read` · `GET /api/systems`, `POST /api/systems/{code}/simulate-outage {down}` [admin] · `GET /api/connectors`, `POST /api/connectors` · `PUT /api/connectors/{id}/mapping` · `GET /api/metrics/summary`, `/api/metrics/connectors` [admin] · `GET /api/audit` [admin] · `GET /api/health` (public).

## 12. Business logic

- **Identity resolution:** `resolve(master, system)` → existing link, else connector `lookup` by normalized mobile + DOB (DOB reformatted to the system's format). 1 hit → link (`mobile_dob`, 1.0); 0 → `IDENTITY_NOT_FOUND` (application NEEDS_REVIEW); >1 → conflict for officer.
- **Golden record + survivorship:** authoritative source per attribute (name/DOB: hub profile then REV; income: REV; enrolment: EDU; training: SKL). Store per-field provenance `{value, source_system, fetched_at}`.
- **Data-quality checks:** validators per mapping; cross-source consistency: DOB mismatch → open conflict, application NEEDS_REVIEW; name similarity < 0.85 (`difflib` on normalized tokens) → conflict; ≥ 0.85 → warning only.
- **Journey engine:** sequential steps; each step persisted; idempotency key `application_id:step_id`; fetch timeout 5 s, 3 attempts with backoff (1/2/4 s); still failing → step FAILED, application PAUSED_EXCEPTION with plain-language explanation (`error_detail`), audit + notification; `retry` resumes at the failed step. `wait_event` step sets WAITING until matching inbound event.
- **Consent enforcement:** before each `fetch`: active, unexpired consent covering purpose + source system + fields; response filtered to consented fields; every attempt written to `access_log` (ALLOWED/DENIED). Denied → application BLOCKED_CONSENT, event + notification; re-grant then `retry`.
- **SLA:** `due_at = created_at + sla_hours` scaled by `SLA_TIME_SCALE` (env; demo default compresses hours to minutes). Status computed on read: ON_TRACK / AT_RISK (< 25% left) / BREACHED. Dashboard clearly separates live data from seeded "simulated history".
- **Events:** outbox rows with CloudEvents attribute names (`id, source, type, subject, time, data`); dispatcher loop every 1 s, backoff, DEAD after 5 attempts (visible in admin).
- **Metrics:** `fields_total`, `fields_autofilled`, `citizen_typed`, `systems_queried`, `documents_not_uploaded` per application; onboarding seconds per session; per-connector success rate and p50/p95 latency.
- **Audit:** append-only `audit_events` for every state transition, login, SSO issue, consent change, connector change, conflict resolution. (P1: hash chain `hash = sha256(prev_hash + canonical_json(row))` + `GET /api/audit/verify`.)
- **AI/ML:** none in P0. Mapping suggestion is deterministic (name similarity + type inference).

## 13. Synthetic systems

| System | Kind | ID scheme | Details |
|---|---|---|---|
| REV Revenue Dept | XML over HTTP :8001, API key header | applicant ref `REV-<10 digits>`, certs `MH-INC-2025-000123` | `GET /certificates?type=INCOME|CASTE&mobile=&dob=DD/MM/YYYY`; DOB `DD/MM/YYYY`; income as text with commas; category codes as text |
| EDU Education Dept | Legacy SQLite `edu_legacy.db`, table `STUD_MST` | `EDU/2022/00451` | Columns `STUD_ID, STUD_NM (UPPERCASE "PATIL RAHUL S"), DOB_STR (DD-MM-YYYY), MOB_NO, INST_CD, COURSE_CD, YR_OF_STUDY, ADM_STATUS (A/T/D), LAST_UPD`; no API |
| BSS Benefit Scheme System | REST/JSON :8002 + own officer page | `BSS-<year>-<seq>` | `POST /api/schemes/{code}/applications`, `GET /api/applications/{ref}`, `/officer` (own login + SSO), approve/reject → signed webhook to hub |
| SKL Skills & Employment Registry | CSV `data_drop/skills_registry.csv` | `SKL-2023-8841` | Columns `TRAINEE_ID, TRAINEE_NAME, DOB (DD-MM-YYYY), MOBILE, COURSE_CODE, COURSE_NAME, COMPLETION (Y/N), CERT_NO, CERT_DATE`; **not registered at start — onboarded live** |

Outage toggle: `simulate_down` makes REV return 503 / EDU raise lock error on demand (admin button).

## 14. Data strategy (owner: Dev C + Non-coder 1)

Eight synthetic personas, consistent across systems, each testing one behaviour (Marathi + English names; names below are fictional):
1. **Rahul Patil** — clean, eligible (S1).
2. **Sneha Deshmukh** — income above threshold → NOT_ELIGIBLE with reasons.
3. **Aarti Jadhav** — name variants across systems ("Aarti", "Arti", uppercase surname-first) → warning only.
4. **Priya Kulkarni** — DOB differs between REV and EDU → conflict → NEEDS_REVIEW.
5. **Imran Shaikh** — expired certificate → validator failure.
6. **Vikas More** — no EDU record → IDENTITY_NOT_FOUND.
7. **Meera Gaikwad** — income entered as monthly in one source → range validator trips.
8. **Suresh Pawar** — used for consent-revoke demo; also present in SKL for J2 (completed training).
Plus 20 filler citizens for metrics. Seed script creates users (`citizen1..`, `officer1`, `admin1`; demo password in README), systems, journeys, simulated SLA history (flagged `simulated=true`).

## 15. Frontend (React + Vite)

Routes: `/login` · `/citizen` · `/citizen/apply/:journeyId` · `/citizen/applications/:id` · `/citizen/consents` · `/citizen/profile` · `/officer` · `/officer/applications/:id` · `/officer/conflicts` · `/admin` · `/admin/systems` · `/admin/studio` (+`/:connectorId`) · `/admin/audit` · `/admin/journeys`.
Key components: Timeline (step icon, system tag, format chip XML/JSON/SQL/CSV, duration, retry count), DataCard (canonical fields + provenance chips), OnceOnlyMeter, ConsentCard, StatusBadge, SlaBadge, StudioStepper (1 Connect → 2 Sample → 3 Map → 4 Test → 5 Activate & Attach, with running timer), SystemHealthTile with outage toggle, MetricsCharts (Recharts).
Rules: loading/empty/error states everywhere; poll application detail and officer queue every 3 s; footer "Synthetic data — prototype"; reuse the sih-1 look (spacing, sidebar) but rebuild components cleanly; develop against contract JSON fixtures until backend endpoints land.

## 16. Repository structure

```
setu/
  README.md  .gitignore  .gitattributes  .env.example  run_all.py
  scripts/ seed.py  smoke_e2e.py
  docs/ canonical.md  api.md
  data_drop/ skills_registry.csv
  backend/ requirements.txt  pyproject.toml(ruff)  tests/
    app/ main.py config.py db.py models/ schemas/ canonical/entities.json
      api/ auth.py consents.py applications.py connectors.py systems.py officer.py grievances.py metrics.py webhooks.py
      services/ auth.py consent.py identity.py mapping.py transforms.py validators.py rules.py journey_engine.py events.py audit.py sla.py metrics.py
      services/connectors/ base.py rest_json.py rest_xml.py sql_view.py csv_file.py
      journeys/ scholarship_v1.json youth_enterprise_v1.json   rules_config.json
  mock_systems/ rev/ edu/ bss/
  frontend/ src/ pages/ components/ api/ hooks/ styles/
  .github/workflows/ci.yml
```

## 17. Development order and schedule

| When | Goal |
|---|---|
| Sat 19 (Day 0) | Repo, CI, `run_all.py`, models, contracts (`canonical.md`, `api.md`), seed skeleton, storyboard final |
| Sun 20 | Auth/RBAC, mock REV+EDU+BSS running, connector interface + REST_JSON, UI shell + login |
| Mon 21 | REST_XML/SQL_VIEW/CSV, mapping engine, crosswalk, journey engine (API-level happy path) |
| **Tue 22 night — Checkpoint 1** | Citizen applies → 3 systems → canonical → decision → timeline in UI, nothing hardcoded. If it fails, stop new features |
| Wed 23 | Consent + revoke + access log, audit, webhook + SSO into BSS, failure/retry, officer view, conflicts |
| Thu 24 | Studio end-to-end, metrics, PPT screenshots. Studio fallback trigger: not working by noon → YAML configs + reload button + read-only Studio |
| **Fri 25 12:00 — FREEZE** | Bug bash by all six, fresh-clone test on two laptops, evening recording |
| Sat 26–Sun 27 | Edit video, finalize PDF, upload/link check |
| Mon 28 | Submit |

Cut order if behind: Marathi → hash chain → fuzzy → SSE → journey viewer → grievance beyond a record → SLA polish. Never cut: consent, retry/resume, Studio (or its fallback), metrics.

## 18. Team allocation and Git workflow

Hierarchy: **Dev A** integrator/main developer; **Dev B** deputy (merge rights when A unavailable); **Dev C** and **Dev D** work under A/B. Non-coders: **N1** research/evidence/QA/data; **N2** storyboard/PPT/video.

| Owner | Tickets |
|---|---|
| Dev A | T-001, T-002, T-003, T-010, T-011, T-060..T-063, T-070, T-071, T-100, T-102, nightly integration |
| Dev B | T-030..T-036, T-080..T-083, T-073 (after Studio), reviews for C and D |
| Dev C | T-020..T-025, T-040..T-042, T-050..T-052 |
| Dev D | T-064, T-072, T-090..T-096, T-101 |
| N1 | T-025 (with C), evidence register, manual QA scripts, bug triage |
| N2 | storyboard, PPT PDF, voiceover/recording/editing, upload |

Git model: `main` always demo-ready; `dev` integration; branches `feat/T-0xx-slug`; commit `T-0xx: message`; PR → `dev` with template (ticket, what changed, how to test, screenshots), **1 review + green CI**; review chain: C/D → B, B → A, A → B; A merges `dev`→`main` nightly after `smoke_e2e.py` passes and tags `d1..d7`; `git pull --rebase origin dev` before PR; no force-push to shared branches; after freeze only `fix/*` PRs with 2 approvals. GitHub: protect `main` and `dev` (PR required, CI required).

## 19. Ticket backlog

| ID | Title | Pri | Deps | Acceptance criteria |
|---|---|---|---|---|
| T-001 | Repo skeleton, `run_all.py`, CI, README (Windows) | P0 | — | Fresh clone → documented commands → all services start; CI green on `windows-latest` |
| T-002 | SQLAlchemy models + `seed.py --reset` | P0 | T-001 | All tables from §9 exist; reset recreates personas, systems, journeys |
| T-003 | Contracts `canonical.md`, `api.md`, `entities.json` | P0 | — | Reviewed by B, C, D; frozen Day 1 |
| T-010 | Login, JWT, RBAC dependencies | P0 | T-002 | Wrong password → 401; role-restricted routes → 403 |
| T-011 | RS256 keys, JWKS, `/sso-token`, BSS `/sso` | P0 | T-010, T-022 | Officer opens BSS without a second login; expired/forged token rejected |
| T-020 | REV XML service | P0 | T-003 | Returns income/caste XML by mobile+DOB; API key required |
| T-021 | EDU legacy DB + seed | P0 | T-003 | `STUD_MST` populated for personas with legacy quirks |
| T-022 | BSS service, officer page, signed webhook | P0 | T-003 | Approve/reject sends valid HMAC webhook; own login + SSO works |
| T-023 | SKL CSV in `data_drop/` (not registered at start) | P0 | T-003 | File present; no connector exists until Studio creates it |
| T-024 | Outage toggle for REV/EDU | P0 | T-020, T-021 | Toggle causes 503 / DB lock error until reset |
| T-025 | Persona fixtures across systems | P0 | T-003 | 8 personas behave as §14 |
| T-030 | Connector interface + REST_JSON | P0 | T-003 | Fetch + map BSS-style JSON; timeout 5 s enforced |
| T-031 | REST_XML connector | P0 | T-030 | REV XML parsed with defusedxml; mapped to canonical |
| T-032 | SQL_VIEW connector (read-only, SELECT-only) | P0 | T-030 | EDU rows mapped; non-SELECT/`;` rejected |
| T-033 | CSV connector (`data_drop/` only) | P0 | T-030 | Path traversal rejected; SKL rows mapped |
| T-034 | Mapping engine + transforms | P0 | T-030 | All transforms unit-tested; bad path → `MAPPING_ERROR` with field name |
| T-035 | Validators | P0 | T-034 | Each rule unit-tested; failures reported per field |
| T-036 | Auth types + `secret_ref` | P0 | T-030 | api_key/basic/bearer work; no secret value stored in DB |
| T-040 | Identity crosswalk (`mobile_dob`) | P0 | T-030..T-033 | Link persisted; 0/1/>1 hit paths tested |
| T-041 | Golden record + provenance | P0 | T-040 | Each field shows source + time |
| T-042 | Conflict detection + resolve API | P0 | T-041 | Priya persona creates conflict; officer resolves; app resumes |
| T-050 | Consent service + enforcement + field filtering | P0 | T-002 | Unconsented field never leaves hub; revoke → next fetch DENIED |
| T-051 | Consent + access-log APIs | P0 | T-050 | Every fetch attempt logged |
| T-052 | Citizen consent UI + access log | P0 | T-051, T-090 | Grant, revoke, view log |
| T-060 | Journey def loader/validator | P0 | T-003 | Invalid definition rejected with clear message |
| T-061 | Engine: execute + persist steps | P0 | T-060, T-030 | Happy path for J1 reaches SUBMITTED |
| T-062 | Retry/backoff/pause/resume | P0 | T-061 | Outage → PAUSED_EXCEPTION with explanation; retry resumes at failed step; no duplicate calls |
| T-063 | Rules + explainable decision | P0 | T-061 | Reasons list per rule; thresholds from config |
| T-064 | SLA calc + badges | P0 | T-061 | ON_TRACK/AT_RISK/BREACHED correct with `SLA_TIME_SCALE` |
| T-070 | Outbox + dispatcher | P0 | T-002 | Failed delivery retried; DEAD after 5 |
| T-071 | Inbound webhook → resume WAITING step | P0 | T-070, T-022 | Approve in BSS → application APPROVED within 3 s; bad HMAC → 401 |
| T-072 | Notifications API + bell UI | P0 | T-070 | New event visible in ≤ 3 s |
| T-073 | Audit hash chain + verify | P1 | T-070 | Tamper test fails verification |
| T-080 | Studio backend (sample/suggest/test/activate) | P0 | T-030..T-035 | End-to-end for SKL via API |
| T-081 | Studio UI stepper | P0 | T-080, T-090 | Non-developer completes onboarding in < 3 min |
| T-082 | Attach connector to J2 + activation | P0 | T-080, T-060 | J2 step turns from "not configured" to active; new application uses SKL |
| T-083 | Onboarding timer + metric | P0 | T-080 | `onboarding_seconds` recorded, `code_changes=0` |
| T-090 | App shell, routing, auth guard, tokens | P0 | T-003 | Role-based navigation works against fixtures |
| T-091 | Citizen dashboard + apply flow | P0 | T-090 | Consent → apply → redirect to timeline |
| T-092 | Timeline + DataCard + OnceOnlyMeter | P0 | T-091 | Shows systems, formats, provenance, live updates |
| T-093 | Officer queue, conflicts, retry, grievances, beneficiaries | P0 | T-090 | Officer sees consolidated view (applications, approvals, grievances, outcomes) |
| T-094 | Admin systems registry, health, outage toggle, audit viewer | P0 | T-090 | Owner/steward/protocol/ID scheme visible |
| T-095 | Metrics dashboard | P0 | T-064 | Live vs simulated clearly labelled |
| T-096 | Marathi toggle | P1 | T-090 | Key screens switch language |
| T-100 | `smoke_e2e.py` (S1–S6 via API) | P0 | T-061.. | One command prints PASS/FAIL per scenario |
| T-101 | Manual QA checklist + bug bash | P0 | — | Six people run §20 scenarios on two laptops |
| T-102 | Seed reset + demo runbook | P0 | T-002 | Reset to clean demo state in < 30 s |

## 20. Acceptance scenarios (also the demo script and smoke test)

- **S1 Happy path:** Rahul logs in → grants consent → applies → REV(XML)+EDU(SQL) answer → canonical data card with provenance → eligible → submitted to BSS. Citizen typed ≤ 3 fields; meter shows the rest auto-filled.
- **S2 SSO + event loop:** officer clicks "Open BSS" → lands logged in → approves → webhook → citizen timeline shows APPROVED and a notification within 3 s.
- **S3 Outage recovery:** admin turns REV down → new application pauses with plain explanation and SLA warning → admin restores → officer retries → journey resumes without duplicate submissions.
- **S4 Consent revoke:** Suresh revokes → next fetch DENIED, application BLOCKED_CONSENT, access log shows ALLOWED then DENIED; re-grant + retry recovers.
- **S5 Conflict:** Priya's DOB mismatch → NEEDS_REVIEW → officer resolves with source choice → application resumes; golden record shows new provenance.
- **S6 Live onboarding:** admin onboards SKL CSV via Studio in < 3 minutes with zero code changes → J2 step activates → Suresh's J2 application uses SKL data.
- **S7 Metrics:** dashboard shows once-only meter, onboarding seconds, connector success rate/latency, SLA status.
- **S8 Fresh clone:** on a second Windows laptop, README commands alone reach a working S1.

## 21. Testing strategy

- Unit (pytest): transforms, validators, mapping, consent decisions, identity resolution, rules, SLA, HMAC verification.
- API tests (TestClient): auth/RBAC, consent → apply, retry, conflict resolve, connector test/activate.
- Integration: `smoke_e2e.py` against the running stack (S1–S6), run before every `dev`→`main` merge.
- Frontend: `npm run build` in CI; manual checklist for S1–S7; no browser-automation framework.
- Regression: rerun smoke after each merge; freeze means only `fix/*`.
- Manual acceptance: N1 + N2 run S1–S8 Fri morning on both laptops; log bugs as tickets.

## 22. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Studio slips | YAML connector files + reload button + read-only Studio view; narrate honestly |
| Team skill gaps / over-scope | Follow cut order; pair on Studio and journey engine |
| Windows/Python mismatch | Pin 3.12; README setup verified on a fresh laptop Fri |
| SQLite locking under background worker | WAL + `busy_timeout`; short transactions; single engine worker thread |
| Demo instability | Seed reset < 30 s; recorded backup takes; never edit code after freeze except `fix/*` |
| Overclaiming | Claim register (N1); every number sourced or labelled "prototype measurement" |
| Video/portal issues | Unlisted link tested logged-out; backup on Drive with "Anyone with the link" |

## 23. Definition of Done and instructions for ChatGPT

**DoD (ticket):** code merged via reviewed PR; CI green; acceptance criteria demonstrated; unit/API tests added where listed; no console errors; smoke still passes; `seed --reset` still works; README updated if setup changed.

**How ChatGPT must behave**
1. Work one ticket at a time; ask for the ticket ID if missing. Output complete, runnable files with paths, PowerShell commands to run and test, and a 3-line "what to verify".
2. Follow §9–§13 exactly. Never invent tables, endpoints or fields. If a contract is wrong or missing, stop and post a **Contract Change Note** (what, why, impact on tickets) for Dev A to approve.
3. Prefer the standard library and the stack in §8. Do not add infrastructure, frameworks or services. Explain any new dependency and get approval.
4. Keep code simple and commented where non-obvious; write for beginner–intermediate readers.
5. Include tests listed in the ticket. Do not skip error paths (timeouts, bad input, denied consent).
6. Windows first: `pathlib`, no bash-only commands, no symlinks, UTF-8 (`utf-8-sig` for CSV).
7. Never present synthetic data as real; never claim real integrations, compliance, or AI. Label illustrative thresholds.
8. Never put secrets in code or Git. Use `.env` and `secret_ref`.
9. End each answer with: files changed, how to run, how to test, known limitations, next ticket suggestion.
10. Be honest about uncertainty; if a library version or API is unfamiliar, say so and give a minimal working alternative instead of guessing.
11. Disclose AI assistance truthfully if asked about authorship (team will be questioned by evaluators).
