# ADR 0002: The product is called Coffer

**Status:** Accepted
**Date:** 2026-08-22
**Owner:** Kevin

## Context

The workspace has been building "a personal finance manager" — a description, not a name. CANDIDATES flagged this as needing resolution *before anything user-facing carries a title*, and [backlog/0003](../backlog/0003-app-ui-prototype-mock-data.md) is the first ticket that puts words on a screen: a browser tab, a login form, an app shell header.

Naming is normally entangled with domains and trademarks. It is not here: ADR-adjacent to this decision, the Owner confirmed on 2026-08-22 that the product stays localhost-only (the CANDIDATES question "Does this ever leave localhost?" remains open). With no public surface, the name was chosen on fit alone, and a collision check is deferred to the day hosting is wanted.

## Decision

The product is **Coffer**. It is the name used in the UI, in documents, and in prose from this point forward. The folder names (`api`, `app`) and the repo layout do not change.

## Alternatives considered

- **Tally:** echoed "entry speed is a feature" and was the friendliest option, but it is a common word with the weakest distinctiveness if the product ever becomes public.
- **Reckon:** "to reckon accounts" mapped well onto spending-against-intent, but reads as an action rather than a thing you keep.
- **Cairn:** best match for "data outlives the app", and the most distinctive — rejected as too oblique, since nothing about it signals money.
- **Staying unnamed:** rejected. A placeholder title propagates into every screen, screenshot, and document, and the rename cost grows with each one.

## Consequences

- **Easier:** 0003 can put a real title in the shell instead of a placeholder, and nothing built now needs re-labelling later.
- **Easier:** "Coffer" gives the workspace a noun for the product distinct from `management/` (the operating layer) and from the surface names.
- **Harder / to watch:** the name has not been checked against trademarks, package registries, or domains, because it does not need to be while the product is localhost-only. **If the hosting question is ever answered yes, that check happens before anything is published** — and this ADR is superseded if it comes back dirty. `ops` should treat a name collision check as a precondition of the first public release.
