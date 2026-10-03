# SETU

### System Integration & Interoperability Platform for Unified Government Services

> **SIH Problem Statement 26129:**
> *System integration and interoperability among government digital platforms, resulting in fragmented service delivery.*

SETU is a working prototype for integrating fragmented government and institutional digital services through a common orchestration layer. Instead of forcing citizens to repeatedly provide the same information to different systems, SETU demonstrates consent-aware data exchange, canonicalization, provenance tracking, automated journey orchestration, recovery from connector failures, and event-driven status updates.

The prototype is designed as a **real backend-driven integration demo**, not a static frontend mockup.

---

## 1. Project Objective

Government services often depend on information distributed across multiple systems. This creates repeated form filling, inconsistent data exchange, poor visibility into application progress, and fragile integrations.

SETU demonstrates a unified approach where:

```text
Citizen
   ↓
SETU Hub
   ↓
Connectors → Existing / Mock Government Systems
   ↓
Canonical Data + Provenance
   ↓
Journey / Eligibility Engine
   ↓
Target Service
   ↓
Event / Status Update
```

The core idea is:

> **Integrate once, reuse trusted data through consent, orchestrate the complete service journey, and maintain traceability throughout the process.**

---

# 2. MVP Scope

The Grand-Finale-style MVP focuses on four end-to-end scenarios:

### S1 · Happy Path

Citizen logs in → grants consent → submits scholarship application → SETU retrieves required data from multiple systems → canonicalizes and evaluates data → submits the eligible application to BSS.

### S2 · SSO + Event Loop

Officer opens the BSS system through SETU SSO without another login → approves the application → BSS sends a signed webhook → SETU updates the citizen-facing application status.

### S3 · Connector Outage + Live Onboarding

A connector fails → journey pauses safely → connector is restored → application resumes through retry.

Then a new CSV-based system is onboarded through Studio without changing application code:

```text
Create connector
→ Inspect sample
→ Suggest mapping
→ Save mapping
→ Test
→ Activate
→ Use in a journey
```

### S4 · Consent + Recovery

Citizen revokes consent → subsequent protected data access is denied → application becomes `BLOCKED_CONSENT` → citizen grants consent again → retry resumes the journey successfully.

---

# 3. Architecture

```text
                         ┌──────────────────────┐
                         │      React UI        │
                         │      Vite App        │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      SETU HUB        │
                         │       FastAPI        │
                         │                      │
                         │ Auth / Applications  │
                         │ Consent / Connectors │
                         │ Journey Engine       │
                         │ Canonicalization     │
                         │ Provenance / Audit   │
                         │ Metrics / Webhooks   │
                         └───────┬───────┬──────┘
                                 │       │
                ┌────────────────┘       └────────────────┐
                ▼                                         ▼
       ┌────────────────┐                         ┌────────────────┐
       │ Mock Systems   │                         │ Connector /    │
       │                │                         │ Studio Layer   │
       │ REV            │                         │                │
       │ EDU            │                         │ REST / XML     │
       │ BSS            │                         │ REST / JSON    │
       │ SKL            │                         │ SQL VIEW       │
       └────────────────┘                         │ CSV            │
                                                  └────────────────┘
```

### Runtime Services

| Service  |   Port | Purpose                        |
| -------- | -----: | ------------------------------ |
| SETU Hub | `8000` | Main orchestration/API service |
| REV      | `8001` | Revenue / income source        |
| BSS      | `8002` | Scholarship target system      |
| Frontend | `5173` | React web application          |

EDU and SKL are represented through the project's connector/data-source mechanisms.

---

# 4. Technology Stack

### Backend

* Python 3.12
* FastAPI
* SQLAlchemy
* SQLite
* Pydantic
* JWT authentication
* bcrypt
* cryptography
* pytest
* Ruff

### Frontend

* React
* Vite
* React Router
* TanStack Query
* Recharts

### Integration

* REST/JSON
* REST/XML
* SQL view
* CSV
* Signed webhooks
* Connector mappings
* Canonical data model

---

# 5. Repository Structure

```text
sih-26129/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── journeys/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── pyproject.toml
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── ...
│   └── package.json
│
├── mock_systems/
│   ├── rev/
│   ├── bss/
│   └── edu/
│
├── data_drop/
│   └── skills_registry.csv
│
├── scripts/
│   ├── seed.py
│   └── smoke_e2e.py
│
├── docs/
│   ├── api.md
│   ├── canonical.md
│   ├── DECISIONS.md
│   └── TEAM_GUIDE.md
│
├── run_all.py
├── .gitignore
└── README.md
```

---

# 6. Core Functional Components

## Authentication

SETU provides JWT-based authentication for citizens, officers, and administrators.

Authentication also supports the demonstrated BSS SSO flow, allowing an authenticated SETU officer to enter BSS without performing a second login.

---

## Applications

Applications are persisted and tracked through their complete lifecycle.

Typical states include:

```text
NEW
→ PROCESSING
→ ELIGIBLE
→ SUBMITTED
→ APPROVED
```

Exception states include:

```text
PAUSED_EXCEPTION
BLOCKED_CONSENT
```

Applications retain step-level execution information so that failed journeys can be resumed rather than recreated from scratch.

---

## Connector Layer

SETU abstracts external systems behind connector definitions.

Supported connector types:

```text
REST_JSON
REST_XML
SQL_VIEW
CSV
```

Connector configuration includes the information required to retrieve and normalize external records.

This allows different source systems to participate in the same service journey without coupling the journey engine to a particular integration technology.

---

# 7. Canonical Data & Provenance

External systems do not necessarily use the same field names or data structures.

SETU therefore transforms source responses into a canonical representation.

Example:

```text
Source field                 Canonical field
----------------------------------------------
TRAINEE_ID              →    trainee_id
FULL_NAME               →    full_name
COURSE_CODE             →    course_code
STATUS                  →    completion_status
```

The system also records provenance so that data used by a journey can be traced back to its source.

This supports:

* source identification
* field-level traceability
* normalized downstream processing
* auditable data exchange

---

# 8. Consent Management

Consent is enforced as part of protected data access.

The demonstrated lifecycle is:

```text
Consent granted
      ↓
Data access ALLOWED
      ↓
Citizen revokes consent
      ↓
Data access DENIED
      ↓
Application → BLOCKED_CONSENT
      ↓
Consent granted again
      ↓
Retry
      ↓
Journey continues
```

Access events are recorded so the system can distinguish allowed and denied access attempts.

---

# 9. Journey Orchestration

The journey engine executes defined service workflows instead of hard-coding an individual application's entire lifecycle into the UI.

Example scholarship journey:

```text
fetch_income
      ↓
fetch_enrolment
      ↓
evaluate_eligibility
      ↓
submit_bss
```

The engine tracks:

* current step
* step status
* attempts
* external references
* failures
* recovery
* completion

This enables the same orchestration model to work with different connector implementations.

---

# 10. Failure Handling & Recovery

A connector failure does not silently terminate the application's journey.

Example:

```text
REV unavailable
      ↓
Connector error
      ↓
Journey pauses
      ↓
Application → PAUSED_EXCEPTION
      ↓
REV restored
      ↓
Manual retry
      ↓
Journey resumes
```

The recovery path was verified without creating a duplicate BSS submission.

Consent denial follows a separate controlled path:

```text
Consent denial
→ BLOCKED_CONSENT
→ consent re-granted
→ retry
→ successful continuation
```

---

# 11. BSS Event Loop

SETU demonstrates asynchronous status synchronization using signed webhooks.

```text
SETU
  ↓
BSS submission
  ↓
Officer approval in BSS
  ↓
BSS signs webhook
  ↓
SETU verifies/processes webhook
  ↓
Application status updated
  ↓
Citizen sees updated status
```

This demonstrates that SETU is not limited to one-way request/response integration.

---

# 12. Studio: No-Code Connector Onboarding

Studio demonstrates how a new source can be introduced without changing journey/application code.

Current validated example:

```text
SKL CSV
   ↓
Create connector
   ↓
Sample source data
   ↓
Suggested mapping
   ↓
Save mapping
   ↓
Test connector
   ↓
Activate
   ↓
Use in Suresh's journey
```

The SKL source was successfully used by the journey after activation, including its external reference.

This is important to the MVP because interoperability is demonstrated as a reusable platform capability rather than a single hard-coded integration.

---

# 13. Admin Metrics

The admin metrics endpoint exposes the MVP's core integration measurements.

Current metrics include:

### Once-Only Data

* total applications
* total fields
* automatically populated fields
* citizen-typed fields
* documents not uploaded
* autofill percentage

### Onboarding

* onboarding sessions
* latest onboarding duration
* median onboarding duration
* code changes

The validated Studio onboarding recorded:

```text
code_changes = 0
```

demonstrating the intended no-code connector onboarding workflow.

---

# 14. Main API Surface

Key API areas include:

```text
/api/auth/login
/api/auth/sso-token

/api/applications
/api/applications/{id}
/api/applications/{id}/retry
/api/applications/{id}/status

/api/connectors
/api/consents
/api/consents/{id}/access-log
/api/consents/{id}/revoke

/api/metrics/summary

/api/systems
/api/systems/{code}/simulate-outage

/webhooks/{system_code}

/health
/api/health
```

The exact API contract is maintained in the project documentation.

---

# 15. Demo Accounts

Seeded demonstration accounts:

| User           | Role    | Password   |
| -------------- | ------- | ---------- |
| `rahul.patil`  | Citizen | `Demo@123` |
| `suresh.pawar` | Citizen | `Demo@123` |
| `officer`     | Officer | `Demo@123` |
| `admin`       | Admin   | `Demo@123` |

Citizen master IDs:

```text
Rahul  → SETU-CIT-000001
Suresh → SETU-CIT-000002
```

These accounts are intended only for the local demonstration environment.

---

# 16. Local Setup

## Backend

The project uses Python 3.12 through `pyenv`.

```bash
cd ~/Projects/sih-26129

cd backend
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Frontend

```bash
cd frontend
npm install
```

---

# 17. Seed / Reset Demo Data

The project includes seed functionality for reproducing the demonstration environment.

```bash
cd ~/Projects/sih-26129
python scripts/seed.py
```

The seed data provides the controlled records required by the S1-S4 scenarios.

---

# 18. Run the Complete Demo

From the project root:

```bash
cd ~/Projects/sih-26129
python run_all.py
```

Services:

```text
HUB       http://127.0.0.1:8000
REV       http://127.0.0.1:8001
BSS       http://127.0.0.1:8002
FRONTEND  http://127.0.0.1:5173
```

---

# 19. Testing & Verification

The project has been validated at multiple levels.

## Backend Test Suite

Latest verified result:

```text
70 passed
```

The suite covers the implemented backend behavior and core application logic.

Ruff validation:

```text
All checks passed
```

Repository whitespace validation:

```text
git diff --check
```

passes cleanly.

---

# 20. End-to-End Smoke Test

The primary MVP safety net is:

```bash
python scripts/smoke_e2e.py
```

The smoke test performs real HTTP-level flows against the running system.

Validated result:

```text
S1 Happy path PASS
S2 SSO + event loop PASS
S3 Outage recovery PASS
S4 Consent revoke PASS

RESULT: 4/4 PASS
```

These four scenarios represent the critical functional path of the prototype.

---

# 21. Validation History

The implemented MVP has been specifically verified for:

* scholarship happy-path orchestration
* canonical data transformation
* provenance tracking
* eligibility evaluation
* BSS submission
* officer SSO
* signed webhook processing
* connector outage handling
* application recovery
* retry without duplicate BSS submission
* consent denial
* consent re-grant recovery
* access-log tracking
* CSV connector onboarding
* mapping suggestion and activation
* use of the newly onboarded connector in a real journey
* admin metrics and onboarding measurement

---

# 22. Security & Integrity Demonstrations

The prototype includes:

* JWT-based authentication
* password hashing
* protected API routes
* role-aware administrative access
* consent-aware protected data access
* signed webhook handling
* audit/access logging
* provenance information for exchanged data

These mechanisms are implemented for the demonstration environment and should not be interpreted as production-hardened government infrastructure.

---

# 23. Current Completion State

The core MVP functionality targeted by the current engineering handoff has been implemented and verified through:

```text
Phase 0 / foundation
        ↓
Core backend + contracts
        ↓
Connector integration
        ↓
Journey orchestration
        ↓
Consent + recovery
        ↓
SSO + webhook loop
        ↓
Studio onboarding
        ↓
Metrics
        ↓
End-to-end smoke validation
```

The remaining work before final project freeze is primarily:

```text
T-101 → Manual QA / bug bash
T-102 → Final UI / UX pass
```

These are validation and polish activities rather than replacement of the core MVP architecture.

---

# 24. Deliberately Out of Scope

The current MVP intentionally does **not** attempt to implement:

* Kafka
* Keycloak
* Kubernetes
* Camunda
* Celery / Redis
* zero-knowledge proofs
* blockchain
* LLM-based orchestration
* RS256 / JWKS infrastructure
* production outbox/dispatcher architecture
* real API Setu / DigiLocker integrations
* simulated historical SLA analytics

These were excluded to keep the prototype focused on demonstrating the actual interoperability problem and its working solution within the available MVP scope.

---

# 25. Final Demonstration Story

The complete demonstration can be understood as one continuous story:

```text
1. Citizen logs into SETU
        ↓
2. Grants consent
        ↓
3. Submits a service application
        ↓
4. SETU retrieves information from multiple systems
        ↓
5. External data is mapped to a canonical model
        ↓
6. Provenance is retained
        ↓
7. Eligibility is evaluated
        ↓
8. Application is submitted to the target service
        ↓
9. Officer accesses the target system through SSO
        ↓
10. Officer approves the application
        ↓
11. Signed event returns to SETU
        ↓
12. Citizen status is updated

Meanwhile:

Connector outage
        ↓
Safe pause
        ↓
Recovery
        ↓
Retry

and:

Consent revoked
        ↓
Access denied
        ↓
BLOCKED_CONSENT
        ↓
Consent restored
        ↓
Retry
        ↓
Journey recovered

and:

New CSV system
        ↓
Studio onboarding
        ↓
Mapping
        ↓
Testing
        ↓
Activation
        ↓
Used immediately in the journey
```

---

# 26. Engineering Principles

SETU's MVP is built around a few core principles:

**Interoperability over point-to-point coupling**
Different source technologies should participate through a common connector model.

**Consent before protected access**
Citizen-controlled data access must be enforced by the backend.

**Canonical data over source-specific logic**
Journeys should consume normalized data rather than knowing every external schema.

**Traceability by design**
Important data exchanges and access decisions should remain auditable.

**Recovery instead of restart**
Transient failures should pause and recover a journey rather than forcing the citizen to start again.

**Configuration over code changes**
A new connector should be introducible through the platform's onboarding flow wherever possible.

**Real backend behavior**
The UI represents actual application state, integrations, journeys, failures, and recovery rather than simulated screens alone.

---

# 27. Project Status

**MVP:** Functionally implemented
**Core E2E scenarios:** `4/4 PASS`
**Backend regression suite:** `70 passed`
**Linting:** PASS
**Diff validation:** CLEAN
**Studio onboarding:** Validated
**Metrics:** Validated
**Recovery flows:** Validated
**Current focus:** Manual QA + final UI/UX freeze

---

## SETU in One Sentence

**SETU is a consent-aware interoperability hub that connects fragmented service systems, converts their data into a common model, orchestrates complete citizen journeys, preserves traceability, and recovers gracefully when integrations fail.**



<!-- SETU-LIVE-STATE:START -->
## Current Project State

**Last updated:** 2026-09-28 19:46 IST

- **Active problem statement:** SIH PS 26129, “System integration and interoperability among government digital platforms, resulting in fragmented service delivery.”
- **Current branch:** `feat/T-110-polish`
- **Current HEAD:** `e427bc5`
- **T-081:** Landed. Admin can onboard the SKL CSV source through Studio UI and the live backend connector becomes ACTIVE.
- **T-100b:** Landed. Studio onboarding smoke scenario is part of the S1-S5 smoke coverage.
- **T-111:** Implemented and landed. Admin Dashboard, Access Log and Journeys consume live backend data. Manual acceptance previously confirmed live DENIED audit evidence and configured SKL training mapping.
- **T-110:** Implementation and manual visual QA completed across the scoped Login, Citizen, Officer and Admin surfaces. Current work includes live Citizen application data, unified SETU visual language, shared status/source semantics, loading/empty/error states, bilingual navigation and primary actions, footer standardization, and removal of demo-path placeholder/fixture usage.
- **Known validation before the final gate:** backend pytest 75 passed; Ruff clean; frontend lint 0 errors with 1 known `OfficerApplicationPage.jsx` hook-dependency warning; frontend build passed; git diff check passed; S1-S5 smoke previously passed 5/5.
- **Final gate state:** T-110 Step 8 final validation is the remaining verification gate. Do not treat the submission branch as frozen until that gate passes.
- **QA environment:** stable local stack previously verified on HUB `8000`, REV `8001`, BSS `8002`, frontend `5173`. Firefox/WebDriver/headless automation was intentionally abandoned after instability; normal Firefox manual QA was used.
- **Demo-path integrity:** no active frontend fixture imports and no `PlaceholderPage` route remain on the demo path. Fixture definition files may remain unused.
- **Contract/API scope:** T-110 and T-111 did not introduce backend schema/API behavior changes or new frontend dependencies.
- **Release direction:** after final validation, proceed to freeze/clean-clone/video/deck release work. Keep the submission build isolated from later experimental reconstruction.
- **Dev D preservation:** current frontend work is a controlled integration/polish pass over the previously shipped Dev D frontend work, not a wholesale replacement.
- **Dev C preservation:** the alternate Dev C candidate architecture remains separate. Do not wholesale-merge the stale/divergent candidate branch into the submission baseline.
- **Second build:** a separate reconstruction/alternate implementation is planned only after the submission build is frozen and validated.
<!-- SETU-LIVE-STATE:END -->
