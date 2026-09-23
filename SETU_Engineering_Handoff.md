# SETU (SetuFlow) — Engineering Handoff for ChatGPT

**Version 3.0 · 22 Sep 2026 · supersedes v2 §0, §1(Dates), §17, §18(process), §19, §21, §22, §23(testing note). Sections 2–4, 6–16 are unchanged from v1/v2. This is a practice run of the real SIH Grand Finale format — not tied to a specific submission deadline.**
Author: Senior Technical Authority (Claude) · Audience: ChatGPT (implementation authority) + 4 student developers on Windows.
Rule zero: **this document is the contract.** If something here is wrong, unclear or impossible, say so and propose a change (§23). Do not silently redesign.

## §0. v3.0 note — mock 36-hour Grand Finale drive (read first)

This run is scoped as a **standalone 36-hour build**, matching the real SIH Grand Finale's rhythm (continuous build, periodic checkpoints, hard freeze, then present) — decoupled from a specific calendar date, per your instruction. Run it whenever the team is ready; the hour markers below are elapsed time from your own Hour 0, not clock times.

**One honest flag, not a change to your instruction:** PS 26129's idea-submission portal deadline (30 Sep, per your own earlier info) is a separate, real constraint that this mock drive doesn't remove. Once you've run this 36-hour drive, either it *is* your submission build, or you'll still need to schedule an actual submission pass before 30 Sep. Your call — I'm just flagging it so it isn't lost.

**Target size, explicitly:** appealing, working, functional MVP for an idea-submission video + deck — **not** a production system. If a feature would take more than roughly 150 lines or touch more than 3 files, it's oversized for this scope; simplify or cut it. Formal process (contract-change templates, per-ticket test mandates, ADR logging for every decision) is trimmed on purpose this round — see §17, §18, §21. What's kept is kept because it's cheap and prevents four people from colliding, not because "real teams do it."

This scope stays cut to what a beginner–intermediate team can actually finish and demo in one clean 36-hour drive: lock scope → parallel build blocks → hard checkpoints → freeze → record/submit — the same shape as the real December Grand Finale, so this doubles as a rehearsal for it. `docs/canonical.md` and `docs/api.md` stay frozen (already tagged `contracts-v1`, already tested) except the one small SSO change in CCN-002. Everything cut is an **implementation-scope** cut, not a contract-data cut.

## §0.1 v2.1 — right-sizing for the idea-submission round (22 Sep, later same day)

This round is judged only on the PPT and the demo video — nobody reviews the repo or runs tests. So the only job any documentation needs to do is keep 4 parallel AI-assisted sessions from drifting apart, and `docs/canonical.md` + `docs/api.md` already do that alone. Everything below is cut from §5/§9 as **infrastructure that never appears on screen**, not as functional cuts — the connectors, mapping, consent enforcement and Studio activation are still real and still run.

- Drop `master_citizens` / `identity_links` / per-field provenance timestamps: store name/dob/mobile directly on `users` for citizens; tag each canonical block with a `_source` key inline in `canonical_json`.
- Drop `notifications` table and the bell UI: the citizen timeline polls `/api/applications/{id}` every few seconds; a live status flip to APPROVED already reads as event-driven.
- Drop `audit_events` as a separate table/pipeline: the consent `access_log` (already P0) doubles as the audit trail shown in the video.
- Drop `data_conflicts`, `onboarding_sessions`, `grievances`, `validators_json` entirely — no longer P1/"add back if ahead," just cut.
- Drop active use of the PR checklist, ownership map and Contract Change Note ceremony in `TEAM_GUIDE.md`. If a field must change, tell the other three devs directly.
- Drop `smoke_e2e.py` as an automated PASS/FAIL suite. Replace with: re-run the actual demo click-path once before every recording take.
- Drop PR review entirely for this window: push straight to `dev`; Dev A merges `dev`→`main` at each checkpoint.

Net effect on §9's data model: **8 tables, not 14** — `users` (citizen fields merged in), `systems`, `connectors`, `journey_defs`, `applications`, `application_steps`, `consents`, `access_log`. Everything else in §9 is cut, not deferred.

## 1. Project identity

| Item | Value |
|---|---|
| Name | SETU (working title SetuFlow). Repo: `setu` |
| Event | Smart India Hackathon 2026, idea-submission round |
| Team | 6 members: 4 coders (Dev A integrator/main dev, Dev B deputy, Dev C, Dev D) + 2 non-coders (research/QA/PPT/video) |
| Deliverables | (1) MVP running on a Windows laptop with one command, (2) demo video ≤ ~3:00, (3) 6-slide PDF idea deck |
| Dates | **One 36-hour build drive, hour-marker based, not tied to a calendar date** (see §0). Real portal deadline for the idea round is 30 Sep 2026. |
| Thesis | **Connect a legacy department system in minutes, with no rip-and-replace, and prove what it saved.** |
| Three pillars | (1) Connector-as-configuration (Onboarding Studio) (2) Consent-first exchange with citizen-visible access log (3) Measured once-only impact |

## 2. Problem Statement (verbatim, sole constraint source) and traceability

**Problem Statement ID:** 26129
**Title:** System integration and interoperability among government digital platforms, resulting in fragmented service delivery
**Organization:** Government of Maharashtra · **Department:** Maharashtra State Innovation Society, Department of Skills, Employment, Entrepreneurship and Innovation · **Category:** Software

**Problem Description:** Government departments operate multiple portals, mobile applications, registries, workflow systems and databases that have often been developed independently. Differences in data formats, identifiers, authentication methods, APIs, process definitions and ownership structures can prevent seamless information exchange. Citizens and businesses may be required to submit the same information repeatedly, track applications across different portals, or visit multiple offices. Officials may lack a consolidated view of beneficiaries, applications, approvals, grievances and service outcomes. The challenge is to enable secure, standards-based interoperability without requiring complete replacement of existing systems.

**Expected Solution / Outcome:** An interoperability framework, middleware layer or federated service delivery architecture that supports API based exchange, common data standards, master-data management, consent-based data sharing, single sign on or federated identity, event-driven notifications, unified application tracking and configurable workflow orchestration. The solution should provide reusable connectors for legacy and modern systems, audit logs, role-based access, data-quality checks, exception handling and monitoring dashboards. Expected outcomes include fewer duplicate submissions, reduced processing time, consistent records, improved citizen experience, better cross-department coordination, and measurable improvement in service-level compliance.

### Traceability (every clause must be visible in the demo)

| PS clause | Where it lives in SETU (v2 MVP) | Video scene |
|---|---|---|
| Different data formats | 3 systems: XML (REV), legacy SQL DB (EDU), REST/JSON (BSS); SKL CSV onboarded live | S1, S3 |
| Different identifiers | Each system has its own ID scheme; hub crosswalk links master ID ↔ external IDs | S1 |
| Different authentication methods | REV = API key, BSS = webhook HMAC + SSO token, EDU = local file, no API | S1 |
| Different APIs / process definitions / ownership | Connector configs (owner, protocol, ID scheme) + JSON journey steps | S1, S3 |
| Repeated submissions | Once-only meter shown on the impact end-card | S4 |
| Tracking across portals | Single application timeline across systems | S1, S2 |
| Officials' consolidated view | Officer queue: applications, approvals, notifications | S2 |
| API-based exchange | Connector runtime (REST/XML/SQL/CSV) | S1 |
| Common data standards | Canonical entities, ISO-8601 dates (`docs/canonical.md`, unchanged) | S1 |
| Master-data management | Golden citizen record with per-field provenance | S1 |
| Consent-based sharing | Consent artifacts enforced at the hub; citizen access log | S1, S4 |
| SSO / federated identity | Hub issues a shared-secret token; BSS accepts it (one login, two apps) — simplified per CCN-002 | S2 |
| Event-driven notifications | Webhook updates the application and creates a notification directly | S2 |
| Unified application tracking | Timeline + status | S1–S2 |
| Configurable workflow orchestration | JSON journey definitions; Studio attaches a new connector to a journey | S1, S3 |
| Reusable connectors legacy + modern | 4 connector kinds + Onboarding Studio | S1, S3 |
| Audit logs / RBAC / exception handling | Audit list, roles, retry-on-failure | S2 |
| Outcomes: fewer duplicates, faster, consistent | Impact end-card (measured in prototype, labelled) | S4 |
| No complete replacement | Read-only adapters; legacy systems untouched | S1, S3 |

*(Grievances and interactive conflict-resolution are still contracted in `docs/api.md` but are P1 for this sprint — see §5. If built, add them back to the video/PPT as a bonus line, not a dedicated scene.)*

## 3. Problem, users, objectives

- **Root problem:** departmental systems can't exchange data (formats, IDs, auth, APIs), so citizens re-enter data, chase status across portals, and officials lack one view. Onboarding a legacy system that has *no API* is the unsolved step.
- **Users:** Citizen (applicant), Department Officer (BSS/scheme desk), SETU Admin (integration owner).
- **Objectives (measurable in the prototype):** (a) citizen types ≤ 3 fields for a full scholarship application, (b) onboard a new legacy source in < 3 minutes with 0 code changes, (c) 100% of cross-system reads consent-checked and logged, (d) a failed dependency pauses and resumes without data loss.

## 4. Research conclusions that matter for implementation

Verified (Sep 2026): API Setu grants consumer access only after publisher approval; DigiLocker/MeriPehchaan access is consent-based and issuer onboarding requires hosting APIs first — this is SETU's gap: an on-ramp for systems without APIs. Maha AI / MahaDBT 2.0 / MahaSarathi (announced June 2026) aim at an integrated beneficiary database — SETU is pitched as the connector/orchestration layer that could feed such a platform, not a replacement for it. Public competing builds for this PS already show adapters, consent, and workflow with recovery as table stakes; runtime no-code onboarding and measured impact remain the differentiators.

Assumptions (label in deck): all systems here are synthetic, modelled on plausible legacy patterns; thresholds are illustrative.

## 5. Requirements and scope — v2 MVP (supersedes v1 §5)

**P0 — must work for the video, nothing else matters until these do:**
- FR-01 Login + roles (citizen/officer/admin), JWT (HS256).
- FR-02 **SSO, simplified (CCN-002):** hub issues a short-lived HS256 token signed with a shared secret (`SETU_SSO_SECRET`, same pattern as the webhook HMAC secret); BSS verifies with the same secret. No RS256 key pair, no JWKS endpoint.
- FR-03 Three systems, as contracted: REV (XML, API key), EDU (**no server — a SQLite file + seed rows only**, queried directly by the SQL_VIEW connector), BSS (REST/JSON + its own officer page + signed webhook). SKL (CSV) is onboarded live via Studio.
- FR-04 Connector runtime, all four kinds as contracted (REST_JSON, REST_XML, SQL_VIEW, CSV); mapping engine implements only the transforms actually used by the mapping rows in `docs/canonical.md` §7 (`strip, title_case, to_int, date, enum`) — do not build the full transform library from v1.
- FR-05 Identity crosswalk (deterministic mobile+DOB) and a golden record with provenance. **Conflict detection stays P0** (flags `NEEDS_REVIEW`, visible as a badge); the officer conflict-*resolution* UI is **P1**.
- FR-06 Journey engine, simplified: sequential execution of a JSON step list; each step persisted; **one manual retry** via a Retry button (no automatic backoff loop); on failure, pause with a plain-language `error_detail`.
- FR-07 Consent: artifact (purpose, fields, expiry), enforced per fetch with field filtering, revoke blocks the next call, citizen access log. Unchanged from v1 — cheap and it's a core pillar, build it in full.
- FR-08 Events, simplified: the inbound webhook handler **directly** updates the application row and inserts a notification row in the same request. No outbox table, no background dispatcher, no dead-letter state.
- FR-09 Views: citizen (apply, timeline, data card, consents, access log), officer (queue, approve/retry, notifications), admin (systems, Studio, a one-panel metrics summary, audit list). Drop the connector latency table and the audit hash-chain verify UI from v1's admin scope.
- FR-10 Onboarding Studio — **the differentiator, do not cut**: connect → sample → suggested mapping → test → activate → attach to the SKL journey step; show an onboarding timer.
- FR-11 Metrics: one summary panel — fields autofilled vs citizen-typed, onboarding seconds for the last connector. Cut the per-connector success-rate/latency table and the "simulated SLA history" comparison.
- FR-12 Grievances: **P1 (cut by default)** — a single text field + list is cheap to add back if the team is ahead of schedule, but it is not required for the demo.
- FR-13 One-command run (`run_all.py`, already works), `seed.py --reset` (currently empty — **this is now one of the most urgent gaps**, it must create users, systems, REV/EDU/BSS persona data, and the SKL CSV template used later by Studio), `smoke_e2e.py` (also empty — should automate S1, S2, S3, S4 below so the team can re-verify in seconds before every recording take).

**P1 (add back only if ahead of the T+18h checkpoint, in this order):** grievances → conflict-resolution UI → automatic retry-with-backoff → per-connector metrics table → audit hash chain → Marathi toggle.

**Cut for this sprint (do not build, mention as roadmap only if asked):** Kafka, Keycloak, Kubernetes, Camunda, Celery/Redis, ZKP, blockchain, LLMs, RS256/JWKS, event outbox/dispatcher, SLA simulated-history split, real API Setu/DigiLocker calls.

## 6. Non-negotiable constraints

1. Windows-first (PowerShell). Everything runs with `python run_all.py`. No Docker.
2. Modular monolith hub; SQLite (WAL). React + Vite + FastAPI. Python 3.12.
3. All data synthetic; label "Synthetic data" in the UI footer and the video. Never claim real integrations, compliance, or AI.
4. `docs/canonical.md` and `docs/api.md` are frozen except via a Contract Change Note approved by Dev A.
5. No secrets in Git. `.env.example` only.
6. Every feature must appear in the demo storyboard (§20) or it does not get built this sprint.
7. Readable code for beginner–intermediate developers.

## 7. Architecture

*(unchanged from v1; one v2 note: EDU has no running service — the SQL_VIEW connector opens `mock_systems/edu/edu_legacy.db` directly, read-only. Adapters stay in-process; sidecar packaging remains a roadmap slide only.)*

```
React (citizen | officer | admin+Studio)  ──REST/JSON (JWT)──▶  FastAPI Hub (modular monolith, :8000)
   ├─ auth/RBAC + shared-secret SSO token   ├─ consent + access log   ├─ journey engine (JSON steps, manual retry)
   ├─ connector runtime + mapping engine (REST_JSON | REST_XML | SQL_VIEW | CSV)
   ├─ identity crosswalk + golden record + conflict detection   ├─ webhook → direct update + notification
   └─ audit list + metrics summary
              │ adapters (read-only)                          ▲ signed webhook
   REV (XML, :8001)     EDU (SQLite file, no server)     BSS (REST+officer page, :8002)     SKL (CSV, onboarded live)
```
Ports: hub 8000 · REV 8001 · BSS 8002 · frontend 5173.

## 8. Tech stack

*(unchanged from v1 — already implemented correctly: FastAPI 0.116.1, SQLAlchemy 2.0.43, Pydantic 2.11.7, httpx, PyJWT + cryptography, bcrypt, defusedxml, pytest, ruff, pinned in `backend/requirements.txt`; React 19 + Vite + TanStack Query + Recharts in `frontend/package.json`; `run_all.py` and `.github/workflows/ci.yml` already work as written — do not touch either.)*

## 9. Data model

*(v2 note: `events`, `grievances`, and per-connector metrics columns are P1 — build only if ahead; everything else below is P0 as originally specified.)*

| Table | Key columns |
|---|---|
| users | id, username, password_hash, role (citizen/officer/admin), master_id (nullable), display_name |
| master_citizens | master_id (`SETU-CIT-000001`), full_name, dob, mobile, golden_json, provenance_json, created_at |
| identity_links | id, master_id, system_code, external_id, method, confidence, status |
| data_conflicts | id, master_id, attribute, values_json, status (OPEN/RESOLVED), created_at *(RESOLVED path is P1)* |
| systems | code (REV/EDU/BSS/SKL), name, owner_department, protocol, id_scheme, auth_type, health, simulate_down |
| connectors | id, system_code, name, kind, entity, config_json, lookup_json, mapping_json, validators_json, status, version |
| onboarding_sessions | id, connector_id, admin_id, started_at, activated_at, code_changes (default 0) |
| journey_defs | id, version, name, definition_json, status |
| applications | id, journey_id, journey_version, master_id, status, current_step, correlation_id, created_at, updated_at, outcome, canonical_json, external_refs_json, metrics_json |
| application_steps | id, application_id, step_id, status, attempts, error_code, error_detail, output_json |
| consents | id, master_id, purpose, fields_json, source_systems_json, granted_at, expires_at, revoked_at, status |
| access_log | id, master_id, system_code, purpose, fields_json, at, application_id, outcome |
| notifications | id, user_id or master_id, title, body, read, created_at |
| audit_events | id, ts, actor, action, entity_type, entity_id, detail_json |
| grievances *(P1)* | id, application_id, master_id, text, status, created_at |

## 10–16. Contracts, APIs, business logic, synthetic systems, data strategy, frontend, repo structure

*(unchanged from v1 §10–§16, with two v2 notes below. `docs/canonical.md` (entity fields, consent key catalog, name-matching rules, transform semantics) and `docs/api.md` (endpoint request/response shapes, error codes, the REV XML / EDU table / BSS API / SKL CSV contracts) already exist on disk, are tagged `contracts-v1`, and are covered by `backend/tests/test_canonical_entities.py`. Read those two files directly — do not re-derive them here.)*

**v2 note on §11 (APIs):** per CCN-002, `GET /.well-known/jwks.json` is dropped; `/api/auth/sso-token` now returns a URL carrying an HS256 token signed with `SETU_SSO_SECRET`, and BSS verifies it with the same secret from its own `.env`. The `wait_event` step and outbox/dispatcher description in v1 are P1 generality — the MVP's webhook handler updates the application synchronously in the same request (§5 FR-08).

**v2 note on §14 (data strategy):** for this sprint, seed only the personas the video actually needs: Rahul Patil (clean, eligible — S1), one income-too-high persona for a NOT_ELIGIBLE branch if time allows, Suresh Pawar (used for consent-revoke in S4 and present in the SKL CSV for the Studio demo in S3). The other personas from v1 (DOB-conflict, expired-certificate, name-variant, no-record) are P1 — add them only if ahead, since their scenarios (S5) are not in the v2 video script.

## 17. Development order and schedule — Hour 0–36 mock finale (supersedes v2 §17)

Structured like the real thing: continuous build, two progress checkpoints (standing in for mentor walk-throughs), a hard freeze before presenting, then record/submit. Hours are elapsed time from your own start, not clock times. **If you run this in fewer than 36 hours, compress each block proportionally but keep the checkpoints in the same order and the same content — the gates are what prevent a last-minute failure, not the exact hour count.**

| Block | Hours | Dev A | Dev B | Dev C | Dev D |
|---|---|---|---|---|---|
| Kickoff | 0–1 | Team confirms this v3 scope and CCN-002; everyone pulls `dev` | | | |
| 1 Foundation | 1–8 | DB models, auth (login+JWT), `seed.py` skeleton (users, systems) | Connector base interface + REST_JSON, REST_XML | REV mock system (2–3 personas) + EDU seed function (creates `edu_legacy.db`, no server) | Frontend shell: routing, login page, auth context, API client |
| **Checkpoint 1** | **8** | **Login works; REV returns XML for a persona; REST_XML connector maps it to canonical JSON correctly (a script is enough to verify).** | | | |
| 2 Core | 8–18 | Journey engine (sequential executor) + application/step persistence + manual retry | SQL_VIEW connector (against Dev C's EDU db) + CSV connector + mapping engine for all 4 kinds | BSS mock (submit endpoint, officer page skeleton, webhook sender) + consent service (grant/revoke/access-log) | Citizen apply flow wired to the real API, fixtures swapped for live data as it lands |
| **Checkpoint 2 — GO/NO-GO** | **18** | **S1 happy path works end-to-end via API (script is enough, UI can be partial). If this fails, cut immediately per §22 — no new scope past this point.** | | | |
| 3 Integration (overnight block) | 18–28 | Webhook → direct update + notification (S2); SSO shared-secret token + BSS verify; outage toggle + retry (S3) | Studio backend: sample → suggest → test → activate, targeting SKL | Consent UI wiring; conflict *detection* in the officer queue; finish the 2–3 personas | Officer view (queue, approve trigger, notifications); admin systems/health page |
| **Checkpoint 3** | **28** | **S1, S2, S3 all demoable through the UI, rough styling is fine.** | | | |
| 4 Polish + stretch | 28–32 | Metrics panel; `smoke_e2e.py` for S1–S4 | Studio UI (pair with D) | `seed.py --reset` fast (<30s); continuous manual QA with non-coders | Studio UI (pair with B); UI/UX pass (§22 design-language note). Ahead of schedule? Pick one item from the v2 P1 list (§5), not more. |
| **FREEZE** | **32** | **Stop coding except `fix/*`. Two full team run-throughs.** | | | |
| 5 Record + assemble | 32–35 | Non-coder 2 records (2 full takes); non-coder 1 finalizes deck screenshots and the claim register | | | |
| 6 Wrap | 35–36 | Fact-check, export the PDF, test both video links logged-out — this is your "present to the jury" moment | | | |

## 18. Team allocation and Git workflow — kept simple on purpose (supersedes v2 §18)

Same people, same hierarchy (Dev A integrator, Dev B deputy, C and D under A/B) — big chunks per the block table above, not a long ticket queue. Non-coder 1: manual QA continuously from hour 14 onward, plus the claim register and portal checklist. Non-coder 2: start the storyboard now (don't wait for freeze), then record, edit the PPT and video.

**Git workflow:** feature branches (`feat/<slug>`), self-merge to `dev` with a one-line ping to the team — no mandatory review, no PR template, no ownership-map bureaucracy needed at this size (`docs/TEAM_GUIDE.md` §7 still has a light file-ownership table if two people keep colliding on the same files). `main` stays protected; Dev A merges `dev`→`main` after each checkpoint, always after running `smoke_e2e.py`.

**Stuck rule:** stuck more than **30 minutes** → ask your pair, then Dev A. With 36 hours there's room to think, just not room to stay silently stuck.

## 19. Ticket backlog — right-sized (supersedes v2 §19)

Merged into natural, single-owner units of work instead of process-driven micro-tickets — each row is roughly what one person would sit down and build in one sitting. IDs kept from earlier tickets where useful for continuity with any existing ChatGPT chats.

| ID | What it covers | Owner | Done when |
|---|---|---|---|
| T-001/T-003 | Repo/CI/`run_all.py`, contracts | — | **Already done.** |
| T-002 | DB models + `seed.py --reset` (users, systems, 2–3 personas incl. one SKL CSV row) | A + C | Reset produces a clean demo state in one command |
| T-010/011 | Login, JWT/RBAC, shared-secret SSO for BSS | A | Wrong password → 401; officer opens BSS with no second login |
| T-020/021 | REV mock (XML) + EDU seed (`edu_legacy.db`, no server) | C | Both return real data for the demo personas |
| T-022 | BSS mock: submit endpoint, officer page, signed webhook | C | Approve/reject in the officer page sends a valid webhook |
| T-030/031 | Connector base + REST_JSON + REST_XML | B | REV data maps correctly to canonical JSON |
| T-032/033/034 | SQL_VIEW + CSV connectors + mapping engine (5 transforms: strip, title_case, to_int, date, enum) | B | EDU and SKL both map correctly |
| T-040 | Identity crosswalk + conflict *detection* (no resolve UI) | C | Mismatch shows a `NEEDS_REVIEW` badge |
| T-050/052 | Consent service, enforcement, citizen consent UI, access log | C + D | Revoke blocks the next fetch; log shows why |
| T-061/063 | Journey engine (sequential, one manual retry) + rule-based decision with reasons | A | Happy path reaches SUBMITTED; failure pauses and Retry resumes it |
| T-071 | Webhook → direct application update + notification | A | Officer approval reflects in the citizen view within 3s |
| T-080/081 | Studio: sample → suggest → test → activate, backend + UI | B + D | Onboarding SKL takes under 3 minutes, zero code changes |
| T-090/091 | App shell + citizen apply flow (login → consent → apply → timeline) | D | A full citizen journey works end to end |
| T-093/094 | Officer queue + admin systems/outage-toggle/Studio entry | D | Officer and admin each see what the PS asks for |
| T-095 | Metrics panel (autofill count, onboarding time) | A | Numbers update after a real run |
| T-100/101 | `smoke_e2e.py` for S1–S4 + continuous manual QA | A + C + N1 | One command confirms the demo still works before every take |
| T-102 | UI/UX pass: gov-portal design language, original identity | D | See §22 design-language note; no official emblem/wordmark |

Everything else from the earlier v1/v2 ticket lists (conflict-resolution UI, grievances, audit hash chain, auto-retry backoff, per-connector metrics, Marathi toggle, SLA history) is a stretch goal only — pick at most one in Block 4 if you're genuinely ahead at Checkpoint 3, otherwise leave it as a roadmap line in the deck.

## 20. Acceptance scenarios — v2 (supersedes v1 §20; this is also the video script and the smoke test)

- **S1 Happy path (0:15–1:00 in the video):** Rahul logs in → grants consent → applies → REV(XML) + EDU(SQL) answer → canonical data card with provenance → eligible → submitted to BSS. Citizen typed ≤ 3 fields.
- **S2 SSO + event loop (1:00–1:30):** officer opens BSS with no second login → approves → webhook → citizen timeline shows APPROVED and a notification within 3 seconds.
- **S3 Outage + live onboarding (1:30–2:40):** admin turns REV down → new application pauses with a plain explanation → admin restores → officer retries → resumes. Then: admin onboards the SKL CSV via Studio in under 3 minutes with zero code changes, and it joins the Suresh application.
- **S4 Consent + impact (2:40–3:00):** Suresh revokes consent → next fetch denied, access log shows ALLOWED then DENIED → end-card shows the once-only meter and onboarding time.
- *(S5 conflict-resolution and S7 as a standalone metrics scene are cut from the video — fold any leftover time into S1's data-card provenance detail instead.)*
- **S8 Fresh clone (pre-freeze only, not filmed):** on a second Windows laptop, README commands alone reach a working S1.

## 21. Testing strategy — reduced on purpose (supersedes v2 §21)

Formal unit tests are **optional** for this MVP — skip them unless a specific piece of logic (the eligibility rule, say) is fiddly enough that you'd want to sanity-check it anyway. The real safety net is `smoke_e2e.py` covering S1–S4: run it before every recording take, treat a red result as "do not record." The two tests that already exist and pass — `test_health.py`, `test_canonical_entities.py` — should stay green, but don't add more test scaffolding than that.

## 22. Risks, fallbacks and design language — v3 (supersedes v2 §22)

| Risk | Fallback |
|---|---|
| Checkpoint 2 (hour 18) misses S1 end-to-end | Immediately cut: SQL_VIEW dynamic query → hardcode the EDU lookup string; field-level consent filtering → boolean allow/deny only; conflict detection → skip entirely |
| Studio slips past Checkpoint 2 | YAML connector config file + a reload button + a read-only Studio view; narrate it honestly in the video |
| Four people colliding on the same files | `docs/TEAM_GUIDE.md` §7 has a light ownership table — use it only if you're actually stepping on each other, not as a rule to enforce upfront |
| Overclaiming in the deck | Claim register (non-coder 1); every number sourced or labelled "prototype measurement" |
| Demo instability during recording | `seed --reset` before every take; two full takes; never edit code after freeze except `fix/*` |

**Design language (what "similar to Aaple Sarkar/MahaDBT" should mean here):** don't use the official State Emblem or the exact "Aaple Sarkar"/"MahaDBT" wordmarks — that risks misrepresenting an official government service to the jury, and the Emblem itself is legally protected. Everything else about the *feel* is fair game and is exactly what will make the demo read as a real citizen-service product: a blue/saffron government-portal palette, bilingual Marathi/English labels, large "Apply for a Scheme" cards on the citizen home screen, an eligibility badge on the data card, a status tracker timeline for the application, and a simple top bar. Use SETU's own name and a footer line "Conceptual prototype — not affiliated with Government of Maharashtra." This is the same UX shape as real income/caste-certificate + scheme-matching portals, without borrowing their identity.

## 23. Definition of Done and instructions for ChatGPT

*(Per §21, formal tests are optional this round — "how to test" in ChatGPT's reply means how to verify manually or via `smoke_e2e.py`, not a mandated unit-test suite. Everything else in v1 §23 stands: work one unit of work at a time (§19), follow §9–§13 contracts exactly, raise a Contract Change Note instead of inventing fields, prefer the stack in §8, keep code simple, Windows-first, never fake data as real, no secrets in code, end every answer with files changed / how to run / how to verify / known limitations / what's next, and be honest about uncertainty rather than guessing.)*

## 24. After this drive — resume note

Keep it light: a clean README (setup + a 20-second GIF of S1 running), the repo itself, and 2–3 lines describing what you built and your role — e.g. "Built the connector/mapping engine and the consent-enforcement layer for a government-interoperability prototype (FastAPI, React, SQLite); designed to onboard a new legacy data source without writing code." That's a genuine, defensible line for a BTech CSE resume. Don't build a separate portfolio deliverable for this — the working repo and the demo video already are the portfolio piece.
