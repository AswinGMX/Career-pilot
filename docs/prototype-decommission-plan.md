# Prototype Decommission Plan

## Goal

Retire the root-level prototype safely after the new stack is carrying production traffic.

## Current Prototype Surface

- `src/*`
- `server.js`
- `index.html`
- `styles.css`
- `vite.config.*`
- legacy root scripts in `package.json`

## Freeze Policy

Effective immediately:

- no new product work lands in the prototype
- no bug fixes are made in the prototype unless required only to keep local reference behavior readable
- the prototype is reference-only

## Retirement Sequence

1. Confirm production traffic is fully on the new stack.
2. Keep the prototype available for reference for one short observation window.
3. Remove prototype runtime usage from any local or remote deploy process.
4. Remove legacy scripts from the root `package.json`.
5. Archive or delete root prototype files in one explicit cleanup PR.
6. Update docs so the monorepo is the only documented runtime.

## Decision Record

Choose one:

- archive the prototype in a `legacy/` directory
- remove the prototype entirely after tagging the final legacy commit

Recommended option:

- tag the final legacy state
- then remove the prototype entirely

## Exit Criteria

- no production or staging environment references the prototype
- no CI path builds or tests the prototype
- no active docs instruct users to run the prototype
- the final legacy tag is recorded
