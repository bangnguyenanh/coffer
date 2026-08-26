# Bug 0001: The ledger's filter box drops keystrokes at typing speed

**Status:** Open  ·  **Severity:** High  ·  **Surfaces:** app  ·  **Opened:** 2026-08-26
**Found in:** [Backlog 0003](../backlog/0003-app-ui-prototype-mock-data.md) phase 3, by the `app` agent while building phase 4

## What happens

Typing into the ledger's search/filter box (`#filter-q`) loses characters. Observed: typing `zzz` produced `zz`.

**Why it matters more than it looks.** This product's stated constraint is *"Entry speed is a feature"* — a text input that cannot keep up with a typist undermines the one thing the product claims. It also survived three phases of verification, which is the more alarming half (see *Why it was missed*).

## Reproduction — and what is NOT yet established

**Established**, in a run whose control passed (quick entry accepted all 11 of its keystrokes in the same session, so keystrokes were reaching the page):

- Ledger, filter box focused, type `zzz` as **real keystrokes** → the box shows `zz`.

**NOT established — do not treat any of these as known:**

- **The trigger.** The finding agent reported the loss occurs *after clicking the filter reset button*, and that before reset the same typing is clean. **The PM could not reproduce that ordering** — in the PM's run the loss happened on the *first* typing and the post-reset typing was clean. So the "after reset" condition is **not** the trigger; it looks like a race whose timing simply differed between runs.
- **The rate**, or whether the loss is partial (one character) or total.
- Whether the *filtering itself* is also wrong, or only the box's displayed value.

**The PM's characterization runs are unreliable and their output must not be used as evidence.** In three attempts to measure the loss rate across typing speeds, the **control input also came back empty**, which means keystrokes were not reaching the page in those runs at all — the empty filter values there are a harness failure, not an app measurement. A fixer must build a harness whose control passes *in the same run* before drawing any conclusion.

## Suspected cause — hypothesis, not diagnosis

From the finding agent: `LedgerFilters.set()` builds the next filter state from `value`, which comes from `useSearchParams` — **asynchronous router state**. A keystroke arriving before the router commits the previous one is computed from a stale base and overwrites its predecessor.

Consistent with the evidence: it is a race (which explains why the two observers saw different triggers), and quick entry is immune because its draft lives in local `useState` — proven, `30000` and a description typed at ~8 ms/char with zero loss.

Worth checking while in there: whether the same stale-base pattern affects the other four filter controls (`from`, `to`, `account_id`, `category_id`), which are lower-frequency and so would lose events far more rarely — and be correspondingly harder to notice.

## Why it was missed — the part worth keeping

Every verification pass for phases 1, 2, 2b and 3 **set input values** (native value setter + a synthetic `input` event) rather than **typing** them. Injection delivers one atomic state change and structurally cannot produce the race. Phase 4's harness was the first to send real `Input.dispatchKeyEvent` keystrokes, and it found the defect immediately, three phases late.

**Folded into `.claude/agents/app.md`:** on a product whose stated feature is typing speed, at least one path per text input must be driven as real keystrokes, not injected values.

## Fix bar

- A test — or, while tests are waived, an observed-behavior demonstration — that types into the filter box **as real keystrokes** and shows no loss, with a **control input in the same run** proving keystrokes were landing.
- Say explicitly which trigger was found, since the two observations to date disagree.
- The filter must still be diacritic-insensitive afterwards: `ca phe` finds `Cà phê` (9 rows in the current fixtures).

## Outcome

<!-- Filled by the PM from the fixing agent's evidence. -->
