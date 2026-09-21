# SETU

**SIH PS 26129 — Government Digital Platform Integration & Interoperability**

SETU is a modular-monolith prototype designed around the SIH Problem Statement 26129: fragmented government service delivery caused by limited interoperability and system integration.

The project focuses on a common integration hub that can coordinate synthetic government systems, exchange data through defined contracts, map external data into canonical entities, and support an end-to-end service journey.

---

## Current Phase

**Phase 0 — Gate 0: Foundation & Contract Baseline**

### Completed

- Repository and development environment foundation
- Python `3.12.12` baseline
- Pinned backend dependencies
- React + Vite frontend foundation
- FastAPI Hub foundation
- Synthetic REV system
- Synthetic BSS system
- Unified `run_all.py` development startup
- T-003 canonical data contract
- T-003 API contract
- Canonical entity registry at `backend/app/canonical/entities.json`
- Canonical contract parity test
- Backend tests
- Ruff validation
- Local multi-service startup smoke test

### Current Status

**Phase 0 / Gate 0 is in progress.**

The project is establishing its repository, environment, contracts, service boundaries, and validation baseline before feature implementation.

---

## Architecture

```text
                    ┌─────────────────────┐
                    │   React + Vite UI   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    SETU Hub          │
                    │   FastAPI Backend    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │ REV Mock   │   │ BSS Mock   │   │ Future     │
       │ System     │   │ System     │   │ Connectors  │
       └────────────┘   └────────────┘   └────────────┘

Canonical contracts:
    docs/canonical.md
    docs/api.md

Canonical entity registry:
    backend/app/canonical/entities.json
````

The project uses a **modular monolith** for the SETU Hub. Synthetic government systems remain separate processes so integration behaviour can be demonstrated without depending on real government infrastructure.

---

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── canonical/
│   │   │   └── entities.json
│   │   └── main.py
│   └── tests/
│       ├── test_health.py
│       └── test_canonical_entities.py
│
├── mock_systems/
│   ├── rev/
│   │   └── main.py
│   └── bss/
│       └── main.py
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
│
├── docs/
│   ├── canonical.md
│   ├── api.md
│   ├── DECISIONS.md
│   ├── STATUS.md
│   └── TEAM_GUIDE.md
│
├── scripts/
├── run_all.py
├── requirements.txt
├── .python-version
├── .env.example
├── .gitignore
├── .gitattributes
└── README.md
```

---

## Development Requirements

* Python `3.12.12`
* Node.js
* npm
* Git

The project is developed and validated primarily with Windows/PowerShell compatibility in mind. Linux development is also supported.

---

## Setup

### 1. Clone the repository

```powershell
git clone <repository-url>
cd Maha_Setu
```

### 2. Create the Python environment

```powershell
py -3.12 -m venv backend\.venv
```

Activate it:

```powershell
backend\.venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

```powershell
python -m pip install -r requirements.txt
```

### 4. Install frontend dependencies

```powershell
cd frontend
npm ci
cd ..
```

### 5. Start the project

From the repository root:

```powershell
python run_all.py
```

`run_all.py` starts:

* SETU Hub
* REV synthetic system
* BSS synthetic system
* React/Vite frontend

---

## Service URLs

| Service  | URL                     |
| -------- | ----------------------- |
| SETU Hub | `http://127.0.0.1:8000` |
| REV Mock | `http://127.0.0.1:8001` |
| BSS Mock | `http://127.0.0.1:8002` |
| Frontend | `http://127.0.0.1:5173` |

### Health Endpoints

```text
GET http://127.0.0.1:8000/health
GET http://127.0.0.1:8001/health
GET http://127.0.0.1:8002/health
```

Expected responses:

```json
{"status":"ok"}
```

REV:

```json
{"system":"REV","status":"ok"}
```

BSS:

```json
{"system":"BSS","status":"ok"}
```

---

## Validation

### Backend tests

From the repository root:

```powershell
cd backend
python -m pytest -q
cd ..
```

### Ruff

```powershell
cd backend
python -m ruff check .
cd ..
```

### Frontend build

```powershell
cd frontend
npm run build
cd ..
```

---

## Project Contracts

The following documents define the approved project contracts:

```text
docs/canonical.md
docs/api.md
```

### Canonical Contract

`docs/canonical.md` defines the canonical entities and their fields, types, requiredness, and validation rules.

The canonical entity registry is:

```text
backend/app/canonical/entities.json
```

The parity test ensures that the registry remains consistent with the canonical contract.

### API Contract

`docs/api.md` defines the approved API surface, endpoint behaviour, roles, and error conventions.

---

## Source of Truth

For project decisions and implementation:

1. Repository code and approved project documents
2. `SETU_Engineering_Handoff.md`
3. `docs/canonical.md`
4. `docs/api.md`
5. `docs/DECISIONS.md`
6. `docs/STATUS.md`
7. `docs/TEAM_GUIDE.md`

Do not silently override an approved contract or architectural decision.

---

## Development Rules

* Do not invent canonical fields.
* Do not rename approved fields or endpoints without the required change process.
* Do not silently modify frozen contracts.
* Do not introduce unnecessary frameworks or infrastructure.
* Do not add Docker/Kafka or other architecture changes unless explicitly approved.
* Use synthetic data only.
* Do not commit secrets or local environment files.
* Keep implementation readable and maintainable.
* Validate inputs and error paths.
* Keep changes focused on the assigned ticket.
* Contract changes require a **Contract Change Note (CCN)** and approval through the project governance process.

---

## Roadmap

### Phase 0 — Foundation & Contract Baseline

* Repository/environment foundation
* Service startup
* Contracts
* Canonical entity registry
* Validation baseline
* CI and Gate 0 completion

### Phase 1 — Core Platform Foundation

* Authentication
* RBAC
* Database foundation
* Synthetic personas
* Synthetic government-system integrations
* Connector and data-exchange foundation

### Phase 2 — Interoperability Core

* External-to-canonical mapping
* Validation
* Consent-aware data exchange
* Integration error handling
* Audit trail
* Service coordination

### Phase 3 — Journey & Decision Orchestration

* End-to-end service journey
* Application state management
* Cross-system coordination
* Decision/orchestration logic
* SLA and operational handling

### Phase 4 — Demonstration Experience

* React workflow
* Application visibility
* Data exchange visibility
* Audit/trace visibility
* Integration status
* End-to-end demo journey

### Phase 5 — Hardening

* CI validation
* Integration tests
* E2E validation
* Demo-data verification
* Failure-path testing
* Final SIH demonstration preparation

---

## Current Limitations

The following are **not yet implemented** and must not be treated as completed functionality:

* Authentication and RBAC
* Database schema and seed/reset workflow
* Production integrations
* Full connector layer
* Data-exchange workflow
* Consent enforcement
* Journey orchestration
* Audit workflow
* SLA handling
* Final React workflow
* Complete end-to-end demo

The frontend currently provides the initial React/Vite foundation rather than the final SETU workflow.

---

## Phase 0 Gate 0 Notes

Gate 0 still requires project-level completion and verification of:

* Fresh-clone startup validation
* CI on `windows-latest`
* Database/seed baseline
* Contract review and `contracts-v1` tagging
* Branch protection and PR requirements
* Final repository hygiene verification

The current Hub health endpoint is:

```text
GET /health
```

The Gate 0 checklist currently references:

```text
GET /api/health
```

This discrepancy remains an **open project question** and must not be silently resolved by changing the implementation or contract.

**Proposed default:** retain the current `/health` endpoint until Dev A confirms whether the checklist or implementation should change.

---

## Status

**Project:** SETU
**SIH PS:** 26129
**Phase:** Phase 0
**Gate:** Gate 0
**Current focus:** Foundation and contract baseline
**Status:** In progress