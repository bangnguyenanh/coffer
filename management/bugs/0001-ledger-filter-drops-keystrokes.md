# Bug 0001: The ledger's filter box drops keystrokes at typing speed

**Status:** Fixed 2026-08-27  ·  **Severity:** High  ·  **Surfaces:** app  ·  **Opened:** 2026-08-26
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

## Fourth observation, 2026-08-27 — reproduced, and it is TWO defects

Observed during [0003](../backlog/0003-app-ui-prototype-mock-data.md) phase 6's walkthrough, in a run whose **control (`#entry-description`, plain `useState`) lost nothing across five runs.**

**(a) The race — and the trigger is typing RATE, not the reset button.** Ten real keystrokes into `#filter-q` per speed:

```
 0ms/char   filter  0/10 ""             control 10/10
 5ms/char   filter  4/10 "zzzz"         control 10/10
15ms/char   filter 10/10 "zzzzzzzzzz"   control 10/10
40ms/char   filter 10/10 "zzzzzzzzzz"   control 10/10
```

The 5 ms figure varies run to run (2, 3, 4, 5 of 10) — which is what a race looks like, and **it explains the whole disagreement in this ticket's history**: two observers saw different triggers and a third could not reproduce it, because they were typing at different speeds. It disappears above ~15 ms/char. **The "after clicking reset" trigger is dead** — it was never the trigger.

**(b) A second, DETERMINISTIC loss this ticket did not know about.** A query containing a **space** loses that space at *every* speed, including speeds where ten consecutive characters arrive intact:

```
"pho ga" at 20ms/char    -> "phoga"
"pho ga" at 120ms/char, x3 -> "phoga", "phoga", "phoga"
"a b" into #filter-q      -> 40ms:"ab"   120ms:"ab"
"a b" into #entry-description -> 40ms:"a b"  120ms:"a b"   (control)
```

A deterministic loss is not a race. **Consequence: a multi-word ledger search cannot be typed at all** — on a product whose stated feature is typing speed.

## Mechanism — PM read the code, and (b) is fully explained

`useLedger.ts:74-78`, `searchParamsFromFilters`:

```ts
const value = filters[key].trim();
if (value !== '') params.set(key, value);
```

**Every write to the URL trims.** `LedgerFilters.set()` builds the next state from `value`, which is read back out of the URL (`read('q')`). So the moment a space is the *last* character typed, it is trimmed away before it can be read back — and the next keystroke lands on the trimmed string. `"pho "` becomes `"pho"`, then `g` makes `"phog"`. An interior space can never survive being, for one keystroke, a trailing one.

That same round-trip through asynchronous router state is the race in (a): a keystroke arriving before the router commits the previous one is computed from a stale base and overwrites its predecessor.

**Both defects are the same root cause — filter text lives in the URL — and the trim makes one of them deterministic.**

## Fix bar

- A test — or, while tests are waived, an observed-behavior demonstration — that types into the filter box **as real keystrokes** and shows no loss, with a **control input in the same run** proving keystrokes were landing.
- Say explicitly which trigger was found, since the two observations to date disagree.
- The filter must still be diacritic-insensitive afterwards: `ca phe` finds `Cà phê` (9 rows in the current fixtures).

## Outcome — FIXED 2026-08-27

**Files:** `src/routes/ledger/LedgerView.tsx` (filter state is now `useState`, seeded once from `useSearchParams`; the URL is written behind it with `replace` in an effect; `setFilters` takes a **patch** and merges it in a functional updater), `LedgerFilters.tsx` (`onChange` is `(patch: Partial<Filters>) => void` — `set()` sends one key instead of rebuilding all five), `useLedger.ts` (`searchParamsFromFilters` **no longer trims**; trimming stays where it already was, at the point of *use*), `playwright.config.ts`, new `e2e/bug-0001-filter-keystrokes.spec.ts` (283 lines, 6 tests), `documents/architecture/01-overview.md`.

**The design question, answered:** filter text keeps its URL *presence* and loses its URL *authority*. React state is the source of truth; the URL is a mirror, read exactly once at mount and written thereafter.

**What the app gives up, stated rather than hidden:** a URL change while the ledger is already mounted no longer reaches the controls — browser back/forward across filter states. Nothing observable is lost today, because filter writes are `replace: true` so no filter history entries exist, and every route into the ledger remounts it (`?category_id=none` arriving from `/triage` was verified). The doc carries the warning that matters: **if a same-route link carrying filter params is ever added, do not bolt a URL→state sync onto this.** An incoming query is indistinguishable by content from a stale echo of the view's own write, and adopting the echo is bug 0001 again.

### Before / after — real keystrokes, control in the same run and the same page load

| speed | filter BEFORE | filter AFTER | control |
|---|---|---|---|
| 0 ms/char | 1/10 `"z"` | **10/10** | 10/10 |
| 5 ms/char | lossy, varying | **10/10** | 10/10 |
| 15–120 ms/char | 10/10 | 10/10 | 10/10 |

`"pho ga"` typed at 0 / 20 / 120 ms: before → `""` or `"phoga"`; **after → `"pho ga"` five times out of five.** `"ca phe"` typed at **0 ms/char** → **9 rows**, so diacritic-insensitivity survives the fix at the speed that used to erase the query entirely. The space is proved load-bearing: `pho ga` → 1 row (`Phở gà`); three real Backspaces → `pho` → 3 rows, because `văn phòng` folds to contain `pho`.

**Trigger, stated as the fix bar demands:** typing **rate** for the race; **trim-at-storage** for the space loss. The reset-button theory is dead — measured before and after a reset click at 0 ms/char, identical, 10/10 both times.

### The other four controls — the defect was real, and is now measured rather than reasoned

Writing `from`, `to`, `account_id`, `category_id`, `q` back to back **before** the fix produced `from=…&to=…&account_id=…&category_id=none` — **`q` clobbered entirely.** After: all five present. It was never only the search box; the other four simply fire rarely enough that a lost event was never attributed. One change — patch instead of whole object — fixes all five.

**Verified:** build `✓ 1971 modules · ✓ 212ms`; Playwright **41/41**, and the six new tests were **6/6 red on the pre-fix bundle** and are 6/6 green now. Quick entry re-measured: **11 keystrokes**. Fixtures intact: 56 / 4, `txn_033` untouched. PM re-ran the build and re-read the diff: the trim is gone from `searchParamsFromFilters` and still present in `matches` / `isFiltered`.

**Viewport, the separate job:** `devices['Desktop Chrome'].viewport` is literally `{width:1280, height:720}`, and a project's `use` replaces the top-level one wholesale — so **every screenshot this workspace took before today was 1280×720, whatever the config claimed.** Now applied after the device spread; new shots verified at 1280×900.

**Harness delta — the first one is the keeper:** *run the fix bar against the pre-fix bundle first.* Six tests red before and green after is what makes them a fix bar rather than six assertions that happened to pass — and it caught a bug in the spec itself (three Backspaces landing in the control box because the previous loop iteration had left focus there). Also: `getByRole(name: /regex/)` against Vietnamese copy is a 60-second timeout waiting to happen — `Xóa` and `Xoá` are different strings, so anything a spec must click gets a `data-*` hook. And: a back-to-back write of every control is a cheap race detector for any state-derived-from-async-router pattern — it turned "the other four probably share it" into a measurement, in one test.

<!-- Filled by the PM from the fixing agent's evidence. -->
