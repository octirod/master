# ÓRBITA Transport Discovery Copilot

This folder contains the full-stack internal ÓRBITA workspace for Segitec and Transportes Jorquera. The existing static Segitec website remains in SEGITEC web/.

## Local validation

    pnpm install --frozen-lockfile
    pnpm run typecheck
    pnpm --filter @workspace/discovery-copilot run build

The production deployment is managed by Replit because the application requires an API server, Clerk sessions, and PostgreSQL. Keep database migrations in the normal development schema flow and Replit Publish flow; do not run them from GitHub Actions or deployment startup hooks.

## Architecture

- artifacts/discovery-copilot/ — React web cockpit
- artifacts/api-server/ — authenticated Express API
- lib/db/ — PostgreSQL and Drizzle schema
- lib/api-spec/ — OpenAPI source of truth
- lib/api-client-react/ and lib/api-zod/ — generated clients and validators

## Deployment

The internal deployment is currently published from Replit. Connect orbita.segitecspa.cl through Replit Publishing > Domains and add the A and TXT records Replit provides at the DNS provider. The existing segitecspa.cl website remains separate.