# SETU — Team Guide (commit as `docs/TEAM_GUIDE.md`)# SETU — Team Guide (commit as `docs/TEAM_GUIDE.md`)

## 1. Source of truth

1. **The repo wins.** `docs/canonical.md`, `docs/api.md`, `docs/DECISIONS.md`, `docs/STATUS.md` and the handoff file define the project. A chat (ChatGPT or Claude) is a tool, never an authority.
2. Four developers using AI in parallel drift apart unless each session starts from the same files. Every session begins by attaching/pasting the **latest** contracts from `dev`.
3. A shared chat link is a snapshot. Anyone who continues from it gets their own copy that cannot sync back. Do not treat an answer in a copy as a project decision.

## 2. Roles and authority

- **Dev A** integrator and change authority (approves contract changes, merges `dev`→`main`, owns `DECISIONS.md` and `STATUS.md`). **Dev B** deputy. **Dev C, Dev D** implement under A/B.
- **ChatGPT** implements tickets. **Claude** evaluates, reviews, advises on design and scope. Neither overrides Dev A or the frozen contracts.

## 3. Working with ChatGPT (one chat per ticket)

Start a **new chat for each ticket**. Paste this header, then attach the files:

```
You are implementing ticket <T-0xx> of SETU.
Attached: SETU_Engineering_Handoff.md, docs/canonical.md, docs/api.md (latest from dev), plus the existing files this ticket touches.
Rules: follow the handoff sections 6, 8-13 and 23 exactly; do not invent tables, endpoints or fields; no new dependencies or infrastructure without approval; Windows/PowerShell first; include the tests listed in the ticket.
Ticket (paste the row from section 19, including acceptance criteria): ...
End with: files changed, how to run, how to test, known limitations.
If a contract looks wrong or missing, stop and write a Contract Change Note instead of changing it.
```

After the code works: run tests locally, open a PR, then request review (section 4).

## 4. Working with Claude (review and design)

Claude only sees what you paste. It cannot open a private repo. Send **one ticket per request**, at most about 400 lines (split otherwise).

```
REVIEW REQUEST - Ticket <T-0xx> - Author <Dev X> - Branch feat/...
1. Ticket + acceptance criteria (paste)
2. Files changed (full contents or diff)
3. Test output / screenshot
4. What I am unsure about
Review against the handoff contracts and the PR checklist.
Reply as: Blockers / Should fix / Nice to have / Verdict.
```

Also ask Claude for: trade-off decisions (advisory to Dev A), scope keep/cut calls, demo and slide review, debugging strategy when stuck > 45 minutes. Do not ask Claude to redesign contracts on your own; send a Contract Change Note to Dev A.

## 5. PR checklist (reviewer)

- [ ] Matches ticket acceptance criteria (demonstrated, not claimed)
- [ ] Uses contract field/endpoint names exactly; no new tables/endpoints without a note
- [ ] Error paths handled (timeout, bad input, denied consent, missing record)
- [ ] Tests added and passing; CI green on Windows
- [ ] No secrets, DB files, venv or `.env` committed
- [ ] No hardcoded demo data in UI or engine (data comes from seed/systems)
- [ ] No new dependency/infrastructure without approval
- [ ] PR under about 500 lines; description has how-to-test and a screenshot if UI
- [ ] Touches only files owned by the author's workstream (section 7), or A approved

## 6. Contract Change Note

```
CHANGE: what field/endpoint/table changes
WHY: the problem it solves
AFFECTS: tickets and people
BACKWARD COMPATIBLE: yes/no (migration/seed impact)
APPROVED BY: Dev A, date
```
Only after approval: update `docs/`, log in `DECISIONS.md`, tell the team, then implement.

## 7. Ownership map (fewer merge conflicts)

| Owner | Directories/files |
|---|---|
| Dev A | `services/journey_engine.py`, `events.py`, `audit.py`, `sla.py` (with D), `api/applications.py`, `api/auth.py`, `api/webhooks.py`, `run_all.py`, CI |
| Dev B | `services/connectors/*`, `mapping.py`, `transforms.py`, `validators.py`, `api/connectors.py`, Studio UI |
| Dev C | `mock_systems/*`, `services/identity.py`, `consent.py`, `api/consents.py`, `scripts/seed.py` personas |
| Dev D | `frontend/*` (except Studio UI), `services/metrics.py`, notifications |
| Shared (change via A only) | `models/`, `main.py`, `docs/*`, `requirements.txt`, `package.json` |

## 8. Daily rhythm

- **09:00 stand-up (10 min):** each person posts done / next / blocked in three lines.
- **20:00 PR cutoff.** Dev A runs `smoke_e2e.py`, merges `dev`→`main`, tags `d1`..`d7`, updates `docs/STATUS.md` (ticket · owner · status · blocker).
- **Stuck rule:** > 45 minutes stuck → ask the pair (C/D → B, B → A), then Claude.
- **Evening:** Dev A pastes STATUS + risks to Claude for a scope/risk check.

## 9. Sunday 20 Sep sequence (Day 1) — unblocking order

1. **Dev B:** publish the `Connector` interface + REST_JSON (T-030) by midday so others can code against it.
2. **Dev A:** T-010 login/RBAC, then engine skeleton (T-060/T-061) using a `FakeConnector` so the engine never waits for B.
3. **Dev C:** REV (T-020) and EDU (T-021) first, then BSS skeleton (T-022) and personas (T-025) with Non-coder 1.
4. **Dev D:** shell, routing, auth guard, tokens (T-090) and citizen apply screen against JSON fixtures.
Day-1 exit: login works, REV/EDU return persona data, REST_JSON fetches, UI shell renders fixtures, CI green.
**Checkpoint 1 (Tue 22, night):** citizen applies → REV(XML) + EDU(SQL) → canonical → decision → timeline in UI, nothing hardcoded.

## 10. Gate 0 checklist (verify Phase 0 before building on it)

- [ ] Fresh clone on a second laptop: README commands only → `python run_all.py` → hub `/api/health` OK, REV and BSS up, frontend loads
- [ ] CI green on `windows-latest` (ruff, pytest, `npm ci && npm run build`)
- [ ] `python scripts/seed.py --reset` creates all tables from handoff §9 (and personas if done)
- [ ] `docs/canonical.md` and `docs/api.md` reviewed by B, C, D and tagged `contracts-v1`
- [ ] `main` and `dev` protected (PR + CI required); PR template present
- [ ] `.gitignore`, `.gitattributes` (`* text=auto eol=lf`), `.env.example` present; no venv/DB/`node_modules` committed
- [ ] Python 3.12 pinned; `requirements.txt` pinned

## 11. Red flags — stop and call Dev A

ChatGPT adds Docker/Kafka/new framework · a field or endpoint is renamed · UI shows hardcoded data · error paths skipped · "works on my machine" · PR over 500 lines · two people editing the same file · secrets in Git · a decision made only in a chat.

## 1. Source of truth

1. **The repo wins.** `docs/canonical.md`, `docs/api.md`, `docs/DECISIONS.md`, `docs/STATUS.md` and the handoff file define the project. A chat (ChatGPT or Claude) is a tool, never an authority.
2. Four developers using AI in parallel drift apart unless each session starts from the same files. Every session begins by attaching/pasting the **latest** contracts from `dev`.
3. A shared chat link is a snapshot. Anyone who continues from it gets their own copy that cannot sync back. Do not treat an answer in a copy as a project decision.

## 2. Roles and authority

- **Dev A** integrator and change authority (approves contract changes, merges `dev`→`main`, owns `DECISIONS.md` and `STATUS.md`). **Dev B** deputy. **Dev C, Dev D** implement under A/B.
- **ChatGPT** implements tickets. **Claude** evaluates, reviews, advises on design and scope. Neither overrides Dev A or the frozen contracts.

## 3. Working with ChatGPT (one chat per ticket)

Start a **new chat for each ticket**. Paste this header, then attach the files:

```
You are implementing ticket <T-0xx> of SETU.
Attached: SETU_Engineering_Handoff.md, docs/canonical.md, docs/api.md (latest from dev), plus the existing files this ticket touches.
Rules: follow the handoff sections 6, 8-13 and 23 exactly; do not invent tables, endpoints or fields; no new dependencies or infrastructure without approval; Windows/PowerShell first; include the tests listed in the ticket.
Ticket (paste the row from section 19, including acceptance criteria): ...
End with: files changed, how to run, how to test, known limitations.
If a contract looks wrong or missing, stop and write a Contract Change Note instead of changing it.
```

After the code works: run tests locally, open a PR, then request review (section 4).

## 4. Working with Claude (review and design)

Claude only sees what you paste. It cannot open a private repo. Send **one ticket per request**, at most about 400 lines (split otherwise).

```
REVIEW REQUEST - Ticket <T-0xx> - Author <Dev X> - Branch feat/...
1. Ticket + acceptance criteria (paste)
2. Files changed (full contents or diff)
3. Test output / screenshot
4. What I am unsure about
Review against the handoff contracts and the PR checklist.
Reply as: Blockers / Should fix / Nice to have / Verdict.
```

Also ask Claude for: trade-off decisions (advisory to Dev A), scope keep/cut calls, demo and slide review, debugging strategy when stuck > 45 minutes. Do not ask Claude to redesign contracts on your own; send a Contract Change Note to Dev A.

## 5. PR checklist (reviewer)

- [ ] Matches ticket acceptance criteria (demonstrated, not claimed)
- [ ] Uses contract field/endpoint names exactly; no new tables/endpoints without a note
- [ ] Error paths handled (timeout, bad input, denied consent, missing record)
- [ ] Tests added and passing; CI green on Windows
- [ ] No secrets, DB files, venv or `.env` committed
- [ ] No hardcoded demo data in UI or engine (data comes from seed/systems)
- [ ] No new dependency/infrastructure without approval
- [ ] PR under about 500 lines; description has how-to-test and a screenshot if UI
- [ ] Touches only files owned by the author's workstream (section 7), or A approved

## 6. Contract Change Note

```
CHANGE: what field/endpoint/table changes
WHY: the problem it solves
AFFECTS: tickets and people
BACKWARD COMPATIBLE: yes/no (migration/seed impact)
APPROVED BY: Dev A, date
```
Only after approval: update `docs/`, log in `DECISIONS.md`, tell the team, then implement.

## 7. Ownership map (fewer merge conflicts)

| Owner | Directories/files |
|---|---|
| Dev A | `services/journey_engine.py`, `events.py`, `audit.py`, `sla.py` (with D), `api/applications.py`, `api/auth.py`, `api/webhooks.py`, `run_all.py`, CI |
| Dev B | `services/connectors/*`, `mapping.py`, `transforms.py`, `validators.py`, `api/connectors.py`, Studio UI |
| Dev C | `mock_systems/*`, `services/identity.py`, `consent.py`, `api/consents.py`, `scripts/seed.py` personas |
| Dev D | `frontend/*` (except Studio UI), `services/metrics.py`, notifications |
| Shared (change via A only) | `models/`, `main.py`, `docs/*`, `requirements.txt`, `package.json` |

## 8. Daily rhythm

- **09:00 stand-up (10 min):** each person posts done / next / blocked in three lines.
- **20:00 PR cutoff.** Dev A runs `smoke_e2e.py`, merges `dev`→`main`, tags `d1`..`d7`, updates `docs/STATUS.md` (ticket · owner · status · blocker).
- **Stuck rule:** > 45 minutes stuck → ask the pair (C/D → B, B → A), then Claude.
- **Evening:** Dev A pastes STATUS + risks to Claude for a scope/risk check.

## 9. Sunday 20 Sep sequence (Day 1) — unblocking order

1. **Dev B:** publish the `Connector` interface + REST_JSON (T-030) by midday so others can code against it.
2. **Dev A:** T-010 login/RBAC, then engine skeleton (T-060/T-061) using a `FakeConnector` so the engine never waits for B.
3. **Dev C:** REV (T-020) and EDU (T-021) first, then BSS skeleton (T-022) and personas (T-025) with Non-coder 1.
4. **Dev D:** shell, routing, auth guard, tokens (T-090) and citizen apply screen against JSON fixtures.
Day-1 exit: login works, REV/EDU return persona data, REST_JSON fetches, UI shell renders fixtures, CI green.
**Checkpoint 1 (Tue 22, night):** citizen applies → REV(XML) + EDU(SQL) → canonical → decision → timeline in UI, nothing hardcoded.

## 10. Gate 0 checklist (verify Phase 0 before building on it)

- [ ] Fresh clone on a second laptop: README commands only → `python run_all.py` → hub `/api/health` OK, REV and BSS up, frontend loads
- [ ] CI green on `windows-latest` (ruff, pytest, `npm ci && npm run build`)
- [ ] `python scripts/seed.py --reset` creates all tables from handoff §9 (and personas if done)
- [ ] `docs/canonical.md` and `docs/api.md` reviewed by B, C, D and tagged `contracts-v1`
- [ ] `main` and `dev` protected (PR + CI required); PR template present
- [ ] `.gitignore`, `.gitattributes` (`* text=auto eol=lf`), `.env.example` present; no venv/DB/`node_modules` committed
- [ ] Python 3.12 pinned; `requirements.txt` pinned

## 11. Red flags — stop and call Dev A

ChatGPT adds Docker/Kafka/new framework · a field or endpoint is renamed · UI shows hardcoded data · error paths skipped · "works on my machine" · PR over 500 lines · two people editing the same file · secrets in Git · a decision made only in a chat.
