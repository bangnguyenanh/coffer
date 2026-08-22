# api — backend service

The finance manager's backend: accounts, transactions, categories, and the reporting queries behind them.

- **Stack:** Node · Express · TypeScript · Postgres
- **Owned by:** the `api` sub-agent (`../../management/.claude/agents/api.md`)
- **Its law:** [`documents/`](documents/) — architecture, coding conventions, and the format the agent reports back in.

This service **owns the money contract's server half** — schema, response shapes, and the arithmetic. The `app` client consumes those shapes; it never defines them.

The PM never edits this folder directly; it delegates to the `api` agent with a ticket as the spec.
