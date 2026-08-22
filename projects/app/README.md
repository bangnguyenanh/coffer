# app — web client

The finance manager's web client: transaction entry, the ledger view, categorization, and spending reports.

- **Stack:** React · Vite · TypeScript · Tailwind
- **Owned by:** the `app` sub-agent (`../../management/.claude/agents/app.md`)
- **Its law:** [`documents/`](documents/) — architecture, coding conventions, and the format the agent reports back in.

Consumes the `api` service's shapes; it does not define them. A backend shape you need changed is the `api` agent's contract — flag it to the PM rather than working around it client-side.
