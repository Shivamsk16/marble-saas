# MarblePro

Multi-tenant SaaS for marble and granite businesses in India — inventory (slab-level QR), cutter tracking, GST invoices, E-Way Bill, labour, and reminders.

Built on the reusable foundation in [`saas-multitenant-schema.md`](./saas-multitenant-schema.md). See [`docs/marblepro-architecture.md`](./docs/marblepro-architecture.md) for module mapping and build phases.

## Features (Phases 1–6)

| Phase | Module |
|-------|--------|
| 1 | Auth, multi-tenant, inventory, slabs/QR IDs, dashboard |
| 2 | Cutter machine board, labour workers, attendance, tasks, wages |
| 3 | Clients, GST invoices, payments, printable invoice |
| 4 | E-Way Bill (sandbox mock; wire NIC API for production) |
| 5 | Morning digest cron, task carry-forward, reminder logs |
| 6 | Reports API, material handling guidelines, role-based nav |

## Quick start (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string:**
   - **Transaction pooler** (port `6543`) → `DATABASE_URL` (check “Use connection pooling” / `?pgbouncer=true`)
   - **Direct** (`db.[ref].supabase.co`, port `5432`) → `DIRECT_URL`
3. **Project Settings → API** → copy **Project URL** and **anon public** key into `.env.local`.
4. Copy `.env.example` → `.env.local` and fill values. Set `JWT_SECRET` (`openssl rand -base64 32`).

```bash
npm install
npm run db:push      # creates tables on Supabase
npm run db:seed      # demo owner + sample slabs
npm run dev
```

Prisma reads `.env.local` via `prisma.config.ts`. Next.js uses the same file automatically.

### Local Postgres (optional)

```bash
docker compose up -d
# Use localhost URLs from .env.example instead of Supabase
```

## Quick start (local only)

```bash
docker compose up -d
cp .env.example .env.local
# Set DATABASE_URL + DIRECT_URL to localhost (see .env.example)
npm install && npm run db:push && npm run db:seed && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login** (after seed):

| Field | Value |
|---|---|
| Email | `owner@demo.marblepro.local` |
| Password | `demo1234` |

## Project structure

```
prisma/schema.prisma   # Multitenant + Phase 1 domain tables
src/lib/auth.ts        # JWT session, audit log helper
src/lib/permissions.ts # MarblePro role templates
src/app/api/           # REST route handlers
src/app/(app)/         # Authenticated UI (dashboard, inventory)
```

## MVP roadmap (from product spec)

| Phase | Status |
|---|---|
| 1–6 | Implemented (web). Mobile app / NIC production EWB / MSG91 = integrate when ready |

## Adding domain tables

Every new table must include `tenant_id`:

```prisma
model Invoice {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  // ...
  tenant Tenant @relation(fields: [tenantId], references: [id])
}
```

Log mutations to `audit_logs` via `auditLog()` in `src/lib/auth.ts`.

## License

Private / proprietary — MarblePro SaaS.
