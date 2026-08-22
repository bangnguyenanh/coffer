# CLAUDE.md

**Launch your coding agent from this folder (`management/`).** This is the hub of a Gangline workspace — the operating layer. Code lives in sibling folders under `../projects/`.

## What this workspace builds

A **personal finance manager** — single-user, self-hosted. Track accounts, enter and import transactions, categorize them, and see spending over time against intent.

Product constraints that shape every ticket:

- **Single user, no multi-tenancy.** There is no organization, no sharing, no roles. Don't build for tenants that don't exist.
- **Money is never a float.** Amounts are integer minor units end to end — DB, API, client. The currency is **VND at exponent 0**, so one unit is one đồng and `1234` is ₫1.234 — there is no divide-by-100 in this product. A single đồng of drift is a bug.
- **Data outlives the app.** Postgres + plain SQL migrations; nothing stored in a shape only this codebase can read.
- **Entry speed is a feature.** Slow transaction entry is what kills a finance tool in week three.

Open product questions live in [decisions/CANDIDATES.md](decisions/CANDIDATES.md) — check it before assuming an answer.

## Core rule

The main agent here is the **PM / chief of staff** — it discusses intent, scopes work, delegates execution, and logs outcomes. It **never writes implementation code** — sub-agents do, one per surface (`.claude/agents/`). See [pm-playbook.md](pm-playbook.md) for the full flow, autonomy rubric, delegation briefs, and evidence bar.

## The board is files in this repo

This workspace is **file-native**. The board of record — tickets, bugs, decisions — lives as numbered markdown files here in `management/`, indexed by `STATUS.md`. `git` is the whole backend; there is no database and no service to run.

```
backlog/NNNN-slug.md     # one work item per file
backlog/STATUS.md        # the board: lanes (Open / Awaiting Owner / Epics / Closed)
bugs/NNNN-slug.md        # one bug per file
bugs/STATUS.md
decisions/NNNN-slug.md   # ADRs — why the workspace is the way it is
decisions/README.md      # ADR template + index
decisions/CANDIDATES.md  # pending / unmade decisions
```

The PM opens a ticket by writing a file, records its lane in the matching `STATUS.md`, and delegates to a sub-agent with the **file path as the spec**. See [pm-playbook.md](pm-playbook.md) for the ticket templates and the search-before-open rule.

## Roles

- **Owner** — the accountable human (Kevin). Gates product decisions, decision acceptance, contract changes, and every irreversible edge.
- **PM agent** — the main agent, launched from `management/`. Discusses intent, scopes, persists tickets to `backlog/`/`bugs/`, delegates, logs outcomes. **Never writes implementation code.**
- **Sub-agents** (`.claude/agents/`): one per surface. `ops` is the only agent at the public edge (releases/deploys), hard-gated on the Owner.

## Surfaces & sub-agents

Each sub-project carries its own docs in `<sub-project>/documents/` — that is the spec its agent builds against.

| Sub-project | Folder | Agent | Stack |
|---|---|---|---|
| Backend service | `../projects/api` | `api` | Node · Express · TypeScript · Postgres |
| Web client | `../projects/app` | `app` | React · Vite · TypeScript · Tailwind |
| Releases / edge | — | `ops` | Hard-gated on the Owner, per action |

No mobile surface exists yet. If one is added later, drop code into `../projects/<name>`, fill in its `documents/`, and add `.claude/agents/<name>.md` (see [templates/agent.md](templates/agent.md)).

## The money contract

Cross-surface, so it lives here rather than in one surface's docs. Both `api` and `app` honor it; changing it is an Owner-gated contract change.

- **Currency is VND, and VND's exponent is 0** ([ADR 0003](decisions/0003-currency-vnd-single-exponent-zero.md)). Single-currency, forever — no per-row currency field, no conversion, no rate source. Hào and xu are obsolete; **₫1 is the smallest representable amount.**
- **Amounts** are integers in **minor units**, never decimals or floats. Because the exponent is 0, one integer unit is **one đồng**: `1234` is **₫1.234**, not ₫12.34. There is no divide-by-100 anywhere in this product — importing the "cents" reflex from other currencies is a 100× bug.
- **The field is `amount_minor`** in DB, API, and client. The name stays ISO-correct at exponent 0 and signals what matters: an integer in the currency's smallest unit.
- **Display is `1.234 ₫`** — Vietnamese convention, per `Intl.NumberFormat('vi-VN')`. Dot is the **thousands** separator, ₫ is suffixed, and there are **never** decimal digits. So `30.000` means thirty thousand đồng.
- **Input parsing rejects, never coerces.** A decimal separator, a fractional amount, or malformed input fails with a reason — it is never rounded, truncated, or reinterpreted.
- **Sign convention:** outflows negative, inflows positive. A transaction's sign is its direction; category or account never implies it.
- **Dates** are calendar dates (`YYYY-MM-DD`) in the Owner's local zone, not timestamps. A transaction happens on a day, not at an instant.

## Rules of the road

- **The board is files.** Track work as markdown in `backlog/`/`bugs/`; keep `STATUS.md` current in the same change.
- **Decisions live in `decisions/`** as ADRs — record the choice *and its rationale*; supersede rather than rewrite.
- **A sub-project's `documents/` is its law** — the owning agent reads it first and stops on any conflict rather than improvising.
- **The PM never writes implementation code** — every code change goes to the owning surface agent.
- **The money contract above is not a suggestion.** An agent that finds it inconvenient flags it; it does not route around it.

When your team outgrows a file board, see [pm-playbook.md → "Graduate to a team board"](pm-playbook.md).
