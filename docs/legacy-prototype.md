# Legacy Prototype Boundary

The current root-level application is the legacy prototype.

Prototype files include:

- `src/*`
- `server.js`
- `scripts/dev.js`
- `vite.config.ts`
- `index.html`
- `styles.css`

Rules during the rebuild:

- do not add new production features to the prototype
- use the prototype only as a product and UX reference
- all new production architecture work goes into `apps/*` and `packages/*`

This boundary exists to prevent the rebuild from collapsing back into prototype-first development.
