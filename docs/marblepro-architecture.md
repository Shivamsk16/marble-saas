# MarblePro — Architecture

Multi-tenant SaaS for marble/granite businesses in India. Built on the reusable foundation in [`saas-multitenant-schema.md`](../saas-multitenant-schema.md).

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 15 (App Router), React 19, Tailwind, shadcn/ui |
| API | Next.js Route Handlers + server actions |
| DB | PostgreSQL (Prisma ORM) |
| Cache / real-time (Phase 2+) | Redis |
| Auth | JWT (httpOnly cookie) + bcrypt |
| Mobile (Phase 6) | React Native or PWA interim |

## Tenancy model

- Every business = one `tenants` row.
- All domain tables include `tenant_id` → `tenants(id)`.
- Permissions via `tenant_members` → `roles.permissions` (JSON).
- Platform super-admin bypasses tenant checks via `users.super_admin`.

## MarblePro roles (seeded per tenant)

| Role | Key permissions |
|---|---|
| `owner` | Full tenant access, billing, settings, wages |
| `supervisor` | Inventory read, cutter ops, labour attendance/tasks, no pricing on other workers |
| `labour` | Own tasks, own attendance view, damage report — no invoices/wages |
| `accountant` | Clients, invoices, payments, EWB — no labour wages |

## Module → tables (build order)

| Phase | Module | Tables |
|---|---|---|
| 1 | Auth, inventory, dashboard | `users`, `tenants`, `roles`, `tenant_members`, `invitations`, `audit_logs`, `tenant_settings`, `suppliers`, `products`, `batches`, `slabs` |
| 2 | Cutter tracker | `cutter_machines`, `cutting_jobs`, `cutting_job_outputs` |
| 3 | Invoicing | `clients`, `invoices`, `invoice_lines`, `payments` |
| 4 | E-Way Bill | `ewb_credentials`, `eway_bills` |
| 5 | Labour | `workers`, `attendance`, `wage_records`, `tasks`, `daily_work_logs` |
| 6 | Reminders | `reminder_settings`, `reminder_queue` (Redis workers) |
| 7 | Material guidelines | `handling_guidelines`, `damage_reports` |

## Critical paths (from product spec)

1. **New stock** — `batches` → generate `slabs` with QR `slab_code` → print labels.
2. **Order → cut → invoice** — job order (Phase 2) → `cutting_jobs` → `invoices` → `eway_bills`.
3. **Daily labour** — `attendance` + `tasks` → reminders (Phase 5).
4. **Month-end wages** — `attendance` + `wage_records`.

## Security notes

- EWB credentials: encrypted column, never in `audit_logs` payloads.
- Labour wages: `owner` (+ optional `accountant` for invoices only) — workers never see others' pay.
- Row-level isolation: all queries filter `WHERE tenant_id = :currentTenant`.

## Subscription plans (tenant.plan)

- `trial` — 14 days
- `starter` — ₹999, 5 workers
- `professional` — ₹2,499, 20 workers, invoice + EWB
- `enterprise` — ₹4,999, unlimited, multi-location (future)

Feature flags derived from `plan` in middleware until Razorpay integration (Phase 3+).
