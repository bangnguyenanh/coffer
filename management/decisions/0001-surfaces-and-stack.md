# ADR 0001: Two surfaces — Node/Postgres API and a React web client

**Status:** Accepted
**Date:** 2026-08-22
**Owner:** Kevin

## Context

The workspace was stood up from the Gangline starter, which ships four example surfaces (`api`, `app`, `android`, `ios`). A personal finance manager for one person on one machine doesn't need four. Every surface kept is a sub-agent to maintain, a `documents/` tree to keep true, and a contract boundary to coordinate across — cost paid whether or not the surface gets built.

The stack question was open in the same breath: a full-stack framework would collapse `api` and `app` into one surface, which is cheaper to start but removes the client/server contract boundary the operating model is built around.

## Decision

Two surfaces: **`api`** (Node · Express · TypeScript · Postgres) and **`app`** (React · Vite · TypeScript · Tailwind). The `android` and `ios` stubs are deleted. `ops` is retained.

Money is stored and transported as **signed integer minor units** across both surfaces — pinned as a cross-surface contract in `management/CLAUDE.md`.

## Alternatives considered

- **Next.js full-stack (one surface):** fewer moving parts and no HTTP boundary to design, but it merges the two agents into one and erases the contract discipline — the thing that keeps parallel agent work consistent. Rejected for this workspace, not on technical merit.
- **Web-only, browser-local storage:** fastest to something usable, but a finance ledger that lives in a browser profile is one cache clear away from gone. Rejected — data durability is the point of this tool.
- **Postgres → SQLite:** genuinely tempting for single-user local; rejected to keep the deployment story open and because migrations and numeric handling are already conventional in Postgres. Revisit if local setup friction becomes real.
- **Keeping the android/ios stubs "for later":** carrying surfaces nobody is building means a board that lies about scope. Deleted; re-add from `templates/agent.md` when a mobile client is actually wanted.

## Consequences

- **Easier:** two clean agent lanes that can work in parallel once the API contract is pinned; a data layer that survives the app.
- **Harder:** every feature crossing both surfaces needs its contract pinned in the ticket *before* parallel work starts, per the playbook.
- **To watch:** the API is unauthenticated and localhost-only. *(Still accurate as of 2026-08-25 and not superseded — but [ADR 0004](0004-multi-user-tenant-scoped-from-day-one.md) has since made the product multi-user, so the data model no longer assumes this stays true. The auth work below is now the only thing standing between here and hosting.)* **Superseded in part on 2026-08-29 by [ADR 0007](0007-real-auth-open-signup-hosted-later.md):** the Owner wants friends using Coffer, so "unauthenticated and localhost-only" is no longer the intended end state — real credential auth is being built in [backlog 0008](../backlog/0008-api-auth-signup-login-sessions.md). The *localhost binding* itself still stands: ADR 0007 defers hosting to a separate `ops`-gated decision, so the sentence remains operationally true while its assumption no longer is. That is fine on the Owner's machine and unacceptable the moment it is exposed — the moment hosting is on the table, auth becomes an Owner-gated decision and an `ops` gate, not an incidental addition.
