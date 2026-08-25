# Backlog 0002: Web client foundation — app shell and the money formatting module

**Status:** Closed — 2026-08-23
**Priority:** High
**Surfaces:** app
**Opened:** 2026-08-22
**Reported by:** Owner

## Context

The web client doesn't exist yet. Its foundation is independent of the API's — the shell and the amount formatting/parsing module need no endpoints — so this runs in parallel with 0001 rather than waiting on it.

The formatting module is the client's half of the money contract, and it is the piece most likely to be quietly duplicated in a component later. Building it first, with tests, makes the shared version the obvious one to reach for.

**Auto-persisted:** No — Owner approved as part of workspace setup (2026-08-22). Fails the rubric on change type (addition).

**Epic:** Foundation — first usable expense tracker

## Plan

- `app`: scaffold Vite + React + TypeScript + Tailwind, with routing and an empty ledger view as the landing route.
- `app`: build the single shared money module — minor units → display string, and user input → minor units — per `documents/architecture/01-overview.md`, honoring [ADR 0003](../decisions/0003-currency-vnd-single-exponent-zero.md):
  - **Currency is VND, exponent 0.** One integer unit is one đồng. **There is no divide-by-100 in this module** — the `amount_minor` value is the đồng value. Pin the exponent as a single named constant, not a scattered literal.
  - **Format as `1.234 ₫`** per `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` — dot groups thousands, ₫ suffixed, never any decimal digits.
  - **Parse strictly, reject rather than coerce.** `.` is the *thousands* separator, so `30.000` is thirty thousand. A decimal separator used as a decimal, a fractional amount, or malformed input fails with a reason. No `30k` shorthand — declined in ADR 0003.
- Out of scope: calling the API (no endpoints exist yet — 0001), transaction entry UI, and any real ledger data.
- **Out of scope: automated tests.** Owner decision, 2026-08-22 — this track is a prototype and does not carry a test suite.

**Evidence bar for this ticket:** with no tests, closing requires a build green with the tool named plus **observed behavior in the dev server** — the agent must demonstrate the dot-as-thousands cases by hand (`30.000` → `30000`, a fractional input rejected with its reason) and report what it saw. That is the 100× / 1000× failure mode this module exists to prevent, so it is shown, not asserted.

## Outcome

<!-- Filled post-execution by the PM from the sub-agent's evidence. -->

**Status: Closed — 2026-08-23.** Done 2026-08-22; the Owner's commit gate cleared 2026-08-23 — committed as `ff4e027`, pushed to [bangnguyenanh/coffer](https://github.com/bangnguyenanh/coffer). Body frozen; new related work opens a new ticket.

- **Files changed** (all under `../projects/app/`): `src/lib/money.ts` (the single money module), `src/copy/strings.ts`, `src/App.tsx`, `src/AppShell.tsx`, `src/main.tsx`, `src/routes/ledger/LedgerView.tsx`, `src/index.css`, plus scaffold (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `.gitignore`).
- **Stack:** react 19.2.8 · react-router-dom 7.18.2 · vite 8.2.2 · typescript 7.0.2 · tailwindcss 4.3.3.
- **Verified via:** green build + observed behavior. No test counts — automated tests were out of scope by Owner decision (2026-08-22), which is why the observed-behavior bar below was raised.
- **Evidence — PM re-ran independently, not relayed from the agent:**
  - Build: `npm run build` → `tsc -b && vite build` → green. `✓ 27 modules transformed`, `✓ built in 104ms`, `dist/assets/index-c3l_vryU.js 231.16 kB`. No TS errors.
  - DOM render (agent, headless Chrome `--dump-dom`, dev :5199 and preview :5200): `#root` renders the shell and the empty ledger — `Coffer` / `Sổ cái` / `Chưa có giao dịch nào`. Unknown path `/nope` redirects to the ledger.
  - **The exponent-0 proof:** `formatAmount(1234)` → `"1.234 ₫"`, **not** `"12,34"`. The 100× cents-reflex bug is definitively absent.
  - Parsing, PM's own adversarial cases beyond the agent's: `30.000`→`30000` · `12.345`→`12345` · `30.00`→rejected `DECIMAL_NOT_ALLOWED` · `0.99`→rejected `DECIMAL_NOT_ALLOWED` · `1.23.456`, `.500`, `30.0000`→`MALFORMED_GROUPING` · `abc`→`INVALID_CHARACTERS` · `9007199254740993`→`OUT_OF_RANGE` (safe-integer bound enforced, unprompted).
  - Round-trip format→parse: MATCH on `0`, `1234`, `30000`, `-45000`, `1000000000`.
  - `grep -rnE '/ *100|toFixed|parseFloat' src` → no real hits. `₫` appears nowhere outside `money.ts`.
- **Accepted beyond spec, recorded so it isn't mistaken for drift:** parse error reasons are a typed union (`EMPTY | DECIMAL_NOT_ALLOWED | MALFORMED_GROUPING | INVALID_CHARACTERS | OUT_OF_RANGE`) with Vietnamese copy in `src/copy/strings.ts`; symbol and separators are derived from `Intl.formatToParts` rather than typed as literals, so `CURRENCY_EXPONENT = 0` is the one pinned constant; leading `+`, surrounding whitespace, internal space grouping (`1 000` → `1000`), and the formatter's own output are all accepted as input.
- **Flagged forward:** the agent installed **typescript 7.0.2**. If `api` pins an older major, the two surfaces diverge — worth aligning when 0001 scaffolds.
- **Harness delta:** two, both acted on in this change.
  1. **A cross-surface ADR did not reach the surface that had to obey it.** ADR 0003 (VND exponent 0) landed in the hub, but `../projects/app/documents/` still carried a USD-shaped rule — its worked example told the agent to reject `12.345`, which under vi-VN is *valid* input. I caught it only because I read the surface docs before briefing; briefing straight from the ticket would have halted the agent or taught it to reject correct amounts. The playbook had no rule requiring propagation. → **Folded into pm-playbook → "Decisions must reach the surfaces that obey them".**
  2. **"Behavior observed" needs a real browser for an SPA** — jsdom cannot execute the ESM bundle and leaves `#root` empty, which reads as a failure that isn't one. Headless Chrome `--dump-dom` works with no install. → **Folded into `.claude/agents/app.md` verification bar.**
