# Bellah System — Project Rules

Applies to all code under `apps/` and `packages/`.

## 1. Project Context

PERN-stack monorepo for a beauty/skincare business.
- `apps/web` — React 18, Vite 6, Tailwind v4, shadcn/Radix, TypeScript
- `apps/api` — Express 4, TypeScript, pg (node-postgres), Neon (serverless Postgres)
- Two roles: `admin` (full access) and `staff` (sales + inventory + dashboard only)
- Auth: Clerk (being integrated — do not remove or bypass auth checks)
- DB: Neon (SSL required in pool config)

---

## 2. File & Folder Conventions

### API (`apps/api/src/`)
| Location | Purpose |
|---|---|
| `routes/<feature>.ts` | One router file per feature |
| `db/pool.ts` | Single pool — import here, never recreate |
| `middleware/<name>.ts` | `requireAuth`, `requireAdmin`, `errorHandler` |
| `types/<feature>.ts` | TypeScript types/interfaces |

### Web (`apps/web/src/`)
| Location | Purpose |
|---|---|
| `pages/<PageName>.tsx` | One page per file, PascalCase |
| `components/<Name>.tsx` | Shared components |
| `components/ui/` | shadcn primitives — do not edit unless fixing a bug |
| `lib/api.ts` | **All** API fetch helpers live here |
| `context/AuthContext.tsx` | Auth/role context |
| `types/<feature>.ts` | Shared types |
| `lib/constants.ts` | App constants |

### Naming
- API route files: `kebab-case.ts` → `ai-content.ts`
- REST paths: `/api/kebab-case` → `/api/ai-content`
- DB columns: `snake_case` → `created_at`, `sale_id`
- Frontend vars: `camelCase` → `createdAt`, `lowStockThreshold`
- Always alias DB columns to camelCase in SQL: `low_stock_threshold AS "lowStockThreshold"`

---

## 3. API Design Rules

### REST Shape
```
GET    /api/<resource>          → { data: T[], total, page, limit }
GET    /api/<resource>/:id      → { data: T }   or 404
POST   /api/<resource>          → 201 + { data: T }
PUT    /api/<resource>/:id      → 200 + { data: T }   or 404
PATCH  /api/<resource>/:id/action
DELETE /api/<resource>/:id      → { success: true }   or 404
```

### Errors
```ts
{ error: string }  // never expose err.message or stack traces
```

Status codes: `400` validation, `401` unauthenticated, `403` wrong role, `404` not found, `500` server error.

### Pagination
Every list endpoint accepts `?page=1&limit=20`. Defaults: page 1, limit 20, max 100. Always return `total`.

### Error Handling Pattern
```ts
try {
  // handler logic
} catch (err) {
  console.error(err);          // server only
  res.status(500).json({ error: 'Server error' });
}
```

---

## 4. Database Rules

### Queries
- **Parameterized queries only** — no exceptions:
  ```ts
  pool.query('SELECT * FROM products WHERE id = $1', [id])  // ✅
  pool.query(`SELECT * FROM products WHERE id = ${id}`)     // ❌ never
  ```
- Use JOINs / batch queries — never N+1 loops
- Compute aggregations in SQL, not JS

### Transactions
Any write touching 2+ tables must use a transaction:
```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

### Pool
- One pool in `apps/api/src/db/pool.ts` — import everywhere, never `new Pool()` inside a route
- Config: `max: 10`, `ssl: { rejectUnauthorized: false }`

### Migrations
- New schema changes → numbered files in `migrations/` (`001_initial.sql`, etc.)
- Never edit `schema.sql` in place after first deploy

### Required Indexes
`products(sku)`, `sales(created_at)`, `sale_items(sale_id)`, `sale_items(product_id)`, `ai_content(status)`, `campaigns(status)`

---

## 5. Frontend Rules

### Data Fetching
All fetch calls go through `apps/web/src/lib/api.ts`:
```ts
const BASE = import.meta.env.VITE_API_URL;
export const api = {
  get:    (path, token?) => fetch(`${BASE}${path}`, { headers: ... }).then(r => r.json()),
  post:   (path, body, token?) => fetch(`${BASE}${path}`, { method: 'POST', ... }).then(r => r.json()),
  put:    (path, body, token?) => ...,
  patch:  (path, body, token?) => ...,
  delete: (path, token?) => ...,
};
```
- Never write raw `fetch` in a page or component
- Never hardcode `localhost` — always use `import.meta.env.VITE_API_URL`
- Fetch inside `useEffect`, never at module level

### Loading & Error States — Required on every data-fetching component
```tsx
const [data, setData]       = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError]     = useState<string | null>(null);
```
Show a spinner when `loading`, an error toast/banner when `error`. Never leave the UI silently stale.

### Store (`store.tsx`)
- May only hold **transient UI state** (modal open, active tab, sidebar collapse)
- Must NOT hold products, sales, content, or campaign data
- Replace any `useStore()` call for business data with an API call

### Forms
- Use `react-hook-form` for all business forms
- Convert string → number before submit: `parseFloat(values.price) || 0`
- Display currency: `₱${value.toFixed(2)}`

### UX Feedback — Required on every async action
- Disable submit button + show spinner while in-flight
- `toast.success(...)` on success (Sonner)
- `toast.error(err.error || 'Something went wrong')` on failure

### Code Splitting
```tsx
const Products = React.lazy(() => import('./pages/Products'));
// Wrap routes in <Suspense fallback={<PageSkeleton />}>
```
All page components must be lazy-loaded. Admin-only pages guard at the top:
```tsx
if (role !== 'admin') return <Navigate to="/dashboard" replace />;
```

---

## 6. Auth & Roles

| Role | Can Do |
|---|---|
| `admin` | Everything |
| `staff` | Record sales, view/edit inventory, view dashboard |

Staff **cannot**: delete products, view Users page, approve/reject content, manage campaigns, access admin settings.

### Backend
- `requireAuth` on every protected route (verifies Clerk JWT)
- `requireAdmin` on admin-only routes
- Get `userId` and `role` from `req.auth` (Clerk middleware) — never from `req.body`
- Default to least privilege if role is missing

### Frontend
- Hide admin UI for staff — UX only, not a security boundary
- Use `useUser()` / `useAuth()` from Clerk once integrated

---

## 7. Security Rules

- No hardcoded secrets, `DATABASE_URL`, API keys, or tokens
- Document every env var in `.env.example` with a placeholder
- Never log passwords, tokens, or secrets
- Never expose `err.message`, stack traces, or SQL details in responses
- Validate all request body and query params before use
- CORS origin from `process.env.CORS_ORIGIN` — never `*` in production

---

## 8. Feature-Specific Rules

### Products
- SKU unique — return `400 { error: 'SKU already exists' }` on conflict
- `price`, `cost`, `stock`, `low_stock_threshold` ≥ 0

### Sales
- Always a DB transaction — no partial writes
- Check stock before inserting; reject whole sale if any item goes negative
- Store `unit_price` at time of sale — never recalculate later

### AI Content
- Statuses: `draft` → `approved` | `rejected`
- Only `admin` can approve/reject
- Only `approved` content can attach to a campaign
- `POST /api/ai/generate` is a stub — mark with `// STUB` comment

### Campaigns
- Only attach content where `status = 'approved'`
- Attaching/detaching doesn't change content status

### Dashboard
- Summary endpoint always reads from DB
- In-memory cache max 60s TTL; add a comment if used
- Fetch logic inside components, not at module level

---

## 9. Scalability Rules

- All list endpoints paginate — no unbounded result sets
- One DB pool per process
- No module-level mutable singletons or in-memory sessions
- Lazy-load all page components

---

## 10. Dependencies — Use What's Already Here

| Need | Package |
|---|---|
| Forms | `react-hook-form` |
| Validation | `zod` |
| UI primitives | shadcn/Radix in `components/ui/` |
| Charts | `recharts` |
| Toasts | `sonner` |
| Auth (web) | `@clerk/clerk-react` |
| Auth (api) | `@clerk/express` |
| HTTP client | native `fetch` via `lib/api.ts` — no axios |

Do not add new packages without explicitly listing name + minimum version.

---

## 11. Git Conventions

- Branch: `feature/<topic>`, `fix/<topic>`, `chore/<topic>`
- Commit: `[scope] short description` — e.g. `[content] wire UI to API, remove mock store`
- Commit after each working milestone; keep `main` deployable
- Tag before large changes: `git tag v0.x-stable`

---

## 12. Hard Rules — Never Do These

| ❌ Never |
|---|
| Interpolate user input into SQL strings |
| `new Pool()` inside a route or per-request function |
| Return `err.message`, stack traces, or SQL errors to the client |
| Use `useStore()` for products, sales, content, or campaign data |
| Hardcode `localhost`, API keys, or `DATABASE_URL` |
| Unbounded `SELECT *` on large tables without `LIMIT` |
| Trust `req.body.role` or `req.body.userId` for authorization |
| Write a sale without a DB transaction |
| Add a page component without lazy-loading it |
| Call the API directly from a component (bypass `lib/api.ts`) |
| Use `*` as CORS origin in production |
| Store auth state in module-level API variables |
