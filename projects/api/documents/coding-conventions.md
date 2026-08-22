# Coding conventions

Law for the `api` surface. On any conflict between a ticket and this file, **stop and flag it** — don't improvise a resolution.

## Naming

- `camelCase` for variables and functions, `PascalCase` for types, `kebab-case` for filenames.
- Database identifiers are `snake_case`. A money column is always suffixed `_minor` (`amount_minor`, `opening_balance_minor`) so a float can never be mistaken for an amount at a glance.

## Money — the rules that matter most here

- **Integers only.** `amount_minor: number` in TypeScript, `bigint` in Postgres. A `parseFloat` on an amount is a bug.
- **Parse at the boundary.** User input arrives as text; convert to minor units once, at the edge, and reject anything that isn't exactly representable. Never let a decimal string reach a service.
- **Rounding is explicit.** Any operation that can't divide evenly names its rule in a comment and distributes the remainder deterministically.
- **Sign carries direction.** Outflow negative, inflow positive. Don't encode direction in a separate boolean or infer it from category.

## Errors

- Fail loudly at the boundary; never swallow. Return typed error shapes, not bare strings.
- A rejected amount says *why* (`not a valid amount`, `too many decimal places`) — a finance tool that silently coerces bad input loses the user's trust permanently.

## Tests

- Every behavior change ships with a test; report counts. No merge on red.
- **Money logic gets edge-case tests, not just happy paths:** zero, negative, the largest amount you support, and any split that doesn't divide evenly.

## Comments

Explain *why*, not *what*. Don't narrate ticket history in source.

## Contracts

API response shapes, status codes, and the DB schema are contracts the `app` client relies on. Changing one is a PM-gated decision, not a local edit — flag it and let the PM route it.
