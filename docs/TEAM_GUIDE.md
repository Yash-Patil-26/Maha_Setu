# SETU — Team Guide (commit as `docs/TEAM_GUIDE.md`)

**v1.2 — 22 Sep: fixes a duplication bug in the previously committed file; trims process weight to match the MVP scope (see Handoff v3.0 §0/§18/§21).**

## 1. Source of truth

1. **The repo wins.** `docs/canonical.md`, `docs/api.md`, `docs/DECISIONS.md` and `SETU_Engineering_Handoff.md` define the project. A chat (ChatGPT or Claude) is a tool, never an authority.
2. Four people using AI in parallel drift apart unless each session starts from the same files. Start each ticket chat by attaching the **latest** contracts and the Handoff from `dev`.
3. A shared chat link is a snapshot. Anyone who continues from it gets their own copy that can't sync back — don't treat an answer in a copy as a project decision.

## 2. Roles

**Dev A** integrator (merges `dev`→`main`, owns `DECISIONS.md`). **Dev B** deputy. **Dev C, Dev D** implement under A/B. **ChatGPT** implements. **Claude** reviews, designs, advises on scope. Neither AI overrides Dev A.

## 3. Working with ChatGPT (one chat per unit of work)

```
You are implementing <ID> of SETU.
Attached: SETU_Engineering_Handoff.md (v3.0), docs/canonical.md, docs/api.md (latest from dev).
Rules: follow the Handoff's contracts exactly; don't invent tables/endpoints/fields; no new
dependencies without approval; Windows/PowerShell; formal tests are optional (Handoff §21) —
show me how to verify manually instead.
Ticket: <paste the row from Handoff §19>
End with: files changed, how to run, how to verify, known limitations.
If a contract looks wrong, stop and describe the problem instead of changing it silently.
```

## 4. Working with Claude (review and design)

Claude only sees what you paste — send one unit of work at a time, code + what you're unsure about:

```
REVIEW - <ID> - <Dev X> - branch feat/...
1. What it should do (paste the row from Handoff §19)
2. Code (full files or diff)
3. How you verified it
4. What I'm unsure about
```

Also ask Claude for: scope keep/cut calls, demo and deck review, debugging help when stuck.

## 5. Before you merge (self-check, no formal review needed at this size)

- Matches what the ticket says it should do — you've actually run it, not just read it
- Uses the contract's field/endpoint names exactly
- Obvious error paths don't crash the app (bad input, denied consent, a system being down)
- No secrets, DB files, venv or `.env` committed
- No hardcoded demo data sitting in the UI (data comes from the seed script)

## 6. If a contract genuinely needs to change

Tell Dev A directly (no template needed at this size), agree the change, update `docs/canonical.md` or `docs/api.md` yourself, and drop one line in `docs/DECISIONS.md` so it's not lost. That's it.

## 7. File ownership (use only if two people keep colliding)

| Owner | Area |
|---|---|
| Dev A | auth, journey engine, webhook handling, `run_all.py`, CI |
| Dev B | connectors, mapping engine, Studio backend |
| Dev C | mock systems (REV/EDU/BSS), identity, consent, seed personas |
| Dev D | frontend (all views), Studio UI (with B), metrics display |
| Shared, ask Dev A first | `models/`, `docs/*`, `requirements.txt`, `package.json` |

## 8. Rhythm

Follow the hour-block table in `SETU_Engineering_Handoff.md` §17 — that's the schedule, don't keep a second one here. At each checkpoint: Dev A runs `smoke_e2e.py` and merges `dev`→`main`; everyone posts one line (done / next / blocked). **Stuck more than 30 minutes → ask your pair, then Dev A.**

## 9. Gate 0 — verify the foundation before building on it

- [ ] Fresh clone, README commands only → `python run_all.py` → hub health OK, REV and BSS up, frontend loads
- [ ] CI green on `windows-latest`
- [ ] `python scripts/seed.py --reset` creates a clean demo state
- [ ] `docs/canonical.md` / `docs/api.md` are the versions everyone is coding against

## 10. Red flags — stop and call Dev A

ChatGPT adds Docker/Kafka/a new framework · a field or endpoint gets renamed · the UI shows hardcoded data · "works on my machine" · a decision made only in a chat and never written down anywhere.



<!-- SETU-LIVE-TEAM:START -->
## Current Finale-Sprint State

**Updated:** 2026-09-28 19:46 IST

The active implementation line is `feat/T-110-polish` at `e427bc5`.

T-081, T-100b and T-111 are landed. T-110 has completed its implementation and manual visual QA pass. The remaining immediate engineering checkpoint is the T-110 final validation gate.

Current acceptance evidence includes 75 backend tests passing, Ruff clean, frontend build passing, lint with 0 errors and 1 known hook-dependency warning, git diff check clean, and the S1-S5 smoke suite previously passing 5/5.

The current submission line must keep one canonical implementation. The integrated Dev D frontend is preserved and polished rather than replaced. The Dev C alternate implementation remains isolated from the submission baseline. The later alternate reconstruction is a separate post-freeze workstream.

No backend/API/schema changes are part of T-110/T-111. No new frontend dependency was introduced by the polish pass.
<!-- SETU-LIVE-TEAM:END -->
