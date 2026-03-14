# Testing

## Quick commands

From the **repo root**:

| Command | What it does |
|---------|----------------|
| `pnpm test` | Run API tests (Vitest) |
| `pnpm test:watch` | Run API tests in watch mode |
| `pnpm build` | Build the web app (catches TS/build errors) |
| `pnpm check` | Run tests then build (use before commit) |

From **apps/api**:

| Command | What it does |
|---------|----------------|
| `pnpm test` | Run API tests once |
| `pnpm test:watch` | Run tests in watch mode (re-run on file change) |

## What is tested

- **GET /health** – returns 200 with `ok: true`, `db: true` when DB responds; 500 when DB fails
- **Products CRUD** – POST (201/400), GET (200 + array), PUT (200/404), DELETE (200/404)

The API tests mock the database (`pool.query`), so they run without a real PostgreSQL connection.

## Before you commit

Run:

```bash
pnpm check
```

This runs the API test suite and the web build. If both pass, you’re good to commit.
