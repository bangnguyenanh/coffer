# Personal finance manager

A personal finance manager built on the [Gangline](https://github.com/ogamic/harness-starter-git-based) operating model: a PM agent coordinates, surface agents build, and the board is markdown files in `git`.

![Gangline — a team of harnessed workers connected by one glowing line, driven by a human musher](gangline.png)

## What we're building

A single-user tool for tracking where the money actually goes: import or enter transactions, categorize them, and see spending over time against what you meant to spend.

**Product principles**

- **Single user, own the data.** No accounts to sell, no third-party data broker in the path. Runs on the Owner's machine first.
- **Correctness over features.** Money is never a float; a balance that's wrong by a cent is a bug, not a rounding artifact.
- **Entry has to be fast.** If logging a coffee takes more than a few seconds, the tool stops getting used and the data rots.
- **Boring, inspectable storage.** Postgres and plain SQL — the data outlives the app.

## Surfaces

| Surface | Folder | Agent | Stack |
|---|---|---|---|
| Backend service | [`projects/api`](projects/api) | `api` | Node · Express · TypeScript · Postgres |
| Web client | [`projects/app`](projects/app) | `app` | React · Vite · TypeScript · Tailwind |
| Releases / edge | — | `ops` | Hard-gated on the Owner |

## How to work in this repo

**Launch your coding agent in [`management/`](management/)** — that's the hub, and the PM agent's home.

```
management/backlog/     work items, one markdown file each (STATUS.md is the index)
management/bugs/        bugs, same shape
management/decisions/   ADRs — why this workspace is the way it is
projects/api            backend — the api agent's surface
projects/app            web client — the app agent's surface
```

Start with [`management/CLAUDE.md`](management/CLAUDE.md) and [`management/pm-playbook.md`](management/pm-playbook.md).

## Status

Workspace set up 2026-08-22. No application code yet — see [`management/backlog/STATUS.md`](management/backlog/STATUS.md) for what's queued.

## License

MIT © 2026 Kevin Nguyen — see [LICENSE](LICENSE). Gangline template MIT © Kevin Nguyen.
