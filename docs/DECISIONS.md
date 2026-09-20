# SETU — Decision Log

Rule: only Dev A adds or approves entries. Newest last. Anyone can propose via a Contract Change Note (see TEAM_GUIDE.md §6).

| ID | Date | Decision | Why | Consequence |
|---|---|---|---|---|
| ADR-001 | 19 Sep | Fresh repo `setu`; `sih-1` is reference only | sih-1 has no tests, no auth, hardcoded UI, logic in one handler | Half a day lost, a clean base for 4 parallel developers |
| ADR-002 | 19 Sep | Stack lock: React 19 + Vite (JS), FastAPI modular monolith, SQLite (WAL), Python 3.12, Windows-first, no Docker | Beginner–intermediate team, 7 days, Windows laptops | Kafka, Keycloak, Kubernetes, Camunda, Celery/Redis, ZKP, blockchain, microservices are out; shown only as roadmap |
| ADR-003 | 19 Sep | Thesis: connect a legacy system in minutes, prove what it saved. Pillars: connector-as-configuration (Studio), consent-first exchange with citizen access log, measured once-only impact. Journeys: J1 scholarship, J2 youth-enterprise with SKL CSV onboarded live | Competing public builds already cover adapters, consent, workflow; runtime onboarding and measurement are the gap | Studio is the differentiator; fallback = YAML configs + reload |
| ADR-004 | 19 Sep | Schedule: Checkpoint 1 Tue 22 night; freeze Fri 25 12:00; edit/record Sat–Sun; submit Mon 28; hard deadline Wed 30 | Portal deadline 30 Sep, buffer for upload problems | After freeze only `fix/*` PRs with 2 approvals |
| ADR-005 | 19 Sep | Cut order: Marathi → hash-chain audit → fuzzy names → SSE → journey viewer → grievance beyond a record → SLA polish | Capacity is ~60% of nominal for beginners | Never cut: consent, retry/resume, Studio (or fallback), metrics |
| ADR-006 | 19 Sep | PS traceability upgrades: RS256 JWT + JWKS SSO into BSS; golden record + conflict queue; minimal grievances; connector auth types | Official PS lists SSO, MDM, grievances, different authentication methods | ~1.5 dev-days added, absorbed by cut order |
| ADR-007 | 19 Sep | No AI in P0; Studio mapping suggestion is deterministic | PS does not ask for AI; reliability and honesty | AI use in building is disclosed truthfully if asked |
| ADR-008 | 19 Sep | Submission: 6-slide PDF on the official template; video on YouTube Unlisted with Drive "Anyone with the link" backup; human narration; all data labelled synthetic; every claim in the claim register | Official template rules; evaluators cannot open private links | Non-coder 1 owns the register; Non-coder 2 owns deck and video |
| ADR-009 | 20 Sep | Governance: Dev A is integrator and change authority; Dev B deputy; contracts (`docs/canonical.md`, `docs/api.md`) frozen after Day 1 except via Contract Change Note; repo `docs/` is the source of truth; ChatGPT implements, Claude evaluates and advises | Four parallel AI-assisted sessions drift unless one written source rules | Chat links are references, not authority |
