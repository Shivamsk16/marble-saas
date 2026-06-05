# Multi-Tenant SaaS — Database Schema

> **Reusable for any SaaS product.**
> Copy this schema as a foundation for every new project. It covers user management, multi-tenancy, role-based access, invitations, and audit logging.

---

## Tables Overview

| Table | Purpose |
|---|---|
| `users` | Global registry of every person who signed up |
| `tenants` | One row per client company (isolation boundary) |
| `tenant_members` | Which users belong to which tenant, and what role |
| `roles` | What members are allowed to do inside a tenant |
| `invitations` | Temporary records for inviting new members |
| `audit_logs` | Append-only log of every significant action |

---

## `users`

A global registry of every person who has ever signed up. Has no idea which tenant they belong to — that's handled by `tenant_members`. One user can be a member of multiple tenants.

| Column | Type | What it's for |
|---|---|---|
| `id` | `uuid PK` | Unique ID for this user. Referenced by `tenant_members`, `invitations`, `audit_logs`. |
| `email` | `string` | Login identifier. Must be unique across the platform. |
| `password_hash` | `string` | Never store plain passwords. Store a bcrypt/argon2 hash. |
| `full_name` | `string` | Display name shown in the UI. |
| `super_admin` | `boolean` | If true, full platform access — bypasses all tenant checks. |
| `email_verified` | `boolean` | Block login until email is confirmed. |
| `created_at` | `timestamp` | When they signed up. |

### Relationships
- one → many `tenant_members` — a user can be a member of multiple tenants
- one → many `invitations` — a user can send invitations (`invited_by`)
- one → many `audit_logs` — every action they take is logged (`actor_id`)

> **Example:** Rahul signs up on your platform. One row is created in `users`. He hasn't been added to any tenant yet, so he sees an empty dashboard until provisioned into a tenant.

---

## `tenants`

One row per client company. This is the **isolation boundary** — every piece of data in your app should be traceable back to a `tenant_id`. Think of it as the "account" or "organisation" in your system.

| Column | Type | What it's for |
|---|---|---|
| `id` | `uuid PK` | Referenced by `tenant_members`, `roles`, `invitations`, `audit_logs`. |
| `name` | `string` | Display name, e.g. "Acme Corp". |
| `slug` | `string` | URL-safe identifier, e.g. "acme-corp". Used in subdomains or URL paths. |
| `plan` | `string` | e.g. "trial", "starter", "pro". Controls which features are unlocked. |
| `status` | `string` | "pending", "active", "suspended". Pending = approved but not yet onboarded. |
| `trial_ends_at` | `timestamp` | Null for paid plans. Checked on every login to gate access. |
| `created_at` | `timestamp` | When you provisioned this client. |

### Relationships
- one → many `tenant_members` — a tenant has many member rows
- one → many `roles` — a tenant owns its own set of roles
- one → many `invitations` — a tenant sends invitations to new members
- one → many `audit_logs` — all activity within a tenant is logged

> **Example:** You approve "Acme Corp" as a new client. You create one row in `tenants` with `status="active"` and `plan="trial"`. Then you create Rahul's membership row pointing to this tenant.

---

## `tenant_members`

The most important table in the whole schema. It answers: **"Which users belong to which tenant, and what role do they have?"** Every permission check in your app runs through this table. It is the join between `users`, `tenants`, and `roles`.

| Column | Type | What it's for |
|---|---|---|
| `id` | `uuid PK` | Unique ID for this membership record. |
| `user_id` | `uuid FK` | FK → `users`. Which user this membership belongs to. |
| `tenant_id` | `uuid FK` | FK → `tenants`. Which tenant they're a member of. |
| `role_id` | `uuid FK` | FK → `roles`. What role they have in this tenant. Determines all permissions. |
| `status` | `string` | "invited", "active", "suspended". Invited = they haven't accepted yet. |
| `invited_at` | `timestamp` | When the invitation was sent. |
| `joined_at` | `timestamp` | When they accepted and became active. |

### Relationships
- many → one `users` — many memberships can point to one user (user in multiple tenants)
- many → one `tenants` — many memberships belong to one tenant
- many → one `roles` — many members can share the same role

> **Example:** Rahul is admin at Acme Corp, and also a viewer at Beta Ltd. That's **two rows** in `tenant_members` — same `user_id`, different `tenant_id` and `role_id` each time. When Rahul logs in and switches to Acme, your app loads his row for Acme and checks his role.

---

## `roles`

Defines what members are allowed to do inside a tenant. Each tenant gets its **own copy of roles** — so Acme's "admin" role can have different permissions than Beta Ltd's "admin". System roles like admin/editor/viewer are seeded automatically when a tenant is created.

| Column | Type | What it's for |
|---|---|---|
| `id` | `uuid PK` | Referenced by `tenant_members` and `invitations`. |
| `tenant_id` | `uuid FK` | FK → `tenants`. This role belongs to this tenant only. Null = platform-level role (super_admin). |
| `name` | `string` | e.g. "admin", "editor", "viewer", "billing_manager". |
| `permissions` | `json` | e.g. `{"can_invite": true, "can_edit": true, "can_delete": false}`. Start simple. |
| `is_system_role` | `boolean` | If true, the tenant admin cannot delete or rename this role. |
| `created_at` | `timestamp` | When this role was created. |

### Relationships
- many → one `tenants` — each role is owned by one tenant
- one → many `tenant_members` — a role can be assigned to many members
- one → many `invitations` — when inviting, you pick a role upfront

> **Example:** When you provision Acme Corp, your system auto-creates 3 rows in `roles`: admin, editor, viewer — all with `tenant_id` = Acme's id. Rahul is assigned admin. When Priya is invited as an editor, her future membership row will point to the editor role for Acme.

---

## `invitations`

A temporary record created when an admin invites a colleague. The invitation holds a secret token that gets emailed to the invitee. When they click the link and accept, a `tenant_members` row is created and the invitation is marked accepted. Keeps the membership table clean of unconfirmed state.

| Column | Type | What it's for |
|---|---|---|
| `id` | `uuid PK` | Unique ID for this invitation. |
| `tenant_id` | `uuid FK` | FK → `tenants`. Which tenant is doing the inviting. |
| `invited_by` | `uuid FK` | FK → `users`. The admin who sent the invite. For audit trail. |
| `role_id` | `uuid FK` | FK → `roles`. The role the invitee will get on acceptance. |
| `email` | `string` | Who is being invited. May not have a `users` row yet. |
| `token` | `string` | A random secret included in the invite URL. Expires after use or timeout. |
| `status` | `string` | "pending", "accepted", "expired". Pending = waiting for the invitee to click. |
| `expires_at` | `timestamp` | Typically 48–72 hours. After this, the token is rejected. |

### Relationships
- many → one `tenants` — invitation belongs to a tenant
- many → one `users` — `invited_by` points to the admin who sent it
- many → one `roles` — the role that will be granted on acceptance

> **Example:** Rahul (Acme admin) invites priya@acme.com as an editor. One row in `invitations` is created. Priya gets an email with a link containing the token. She clicks it, creates her account (or logs in), and your app creates her `tenant_members` row and marks the invitation accepted.

---

## `audit_logs`

An append-only log of every significant action taken on the platform. **Never update or delete rows here — only insert.** This is what lets you (and your clients) answer "who changed what, and when?" Essential for debugging permission issues.

| Column | Type | What it's for |
|---|---|---|
| `id` | `uuid PK` | Unique log entry ID. |
| `actor_id` | `uuid FK` | FK → `users`. The user who performed the action. |
| `tenant_id` | `uuid FK` | FK → `tenants`. Which tenant the action happened in. Allows per-tenant audit views. |
| `action` | `string` | e.g. "member.invited", "role.updated", "member.removed". |
| `resource_type` | `string` | What kind of thing was acted on, e.g. "tenant_member", "role". |
| `resource_id` | `uuid` | The specific row that was affected. |
| `before_state` | `json` | Snapshot of the record before the change. Null for creates. |
| `after_state` | `json` | Snapshot after the change. Null for deletes. |
| `ip_address` | `string` | The IP that made the request. Useful for security investigations. |
| `created_at` | `timestamp` | When the action occurred. Never modified after insert. |

### Relationships
- many → one `users` — `actor_id` identifies who did it
- many → one `tenants` — scopes the log to a specific tenant's activity

> **Example:** Rahul changes Priya's role from editor to viewer. Your app inserts one row in `audit_logs`: `actor_id` = Rahul, `action` = "member.role_changed", `before_state` = `{role: "editor"}`, `after_state` = `{role: "viewer"}`. Six months later, Priya asks why she lost access — you can show her exactly what happened and when.

---

## SQL — Full Schema

```sql
-- Users
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  full_name        TEXT,
  super_admin      BOOLEAN DEFAULT FALSE,
  email_verified   BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Tenants (client companies)
CREATE TABLE tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  plan             TEXT DEFAULT 'trial',
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  trial_ends_at    TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Roles (per tenant)
CREATE TABLE roles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id),
  name             TEXT NOT NULL,
  permissions      JSONB DEFAULT '{}',
  is_system_role   BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Tenant members (users ↔ tenants join)
CREATE TABLE tenant_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  role_id          UUID REFERENCES roles(id),
  status           TEXT DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
  invited_at       TIMESTAMP DEFAULT NOW(),
  joined_at        TIMESTAMP,
  UNIQUE (user_id, tenant_id)
);

-- Invitations
CREATE TABLE invitations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  invited_by       UUID NOT NULL REFERENCES users(id),
  role_id          UUID REFERENCES roles(id),
  email            TEXT NOT NULL,
  token            TEXT UNIQUE NOT NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  expires_at       TIMESTAMP NOT NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Audit logs (append-only)
CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id         UUID REFERENCES users(id),
  tenant_id        UUID REFERENCES tenants(id),
  action           TEXT NOT NULL,
  resource_type    TEXT,
  resource_id      UUID,
  before_state     JSONB,
  after_state      JSONB,
  ip_address       TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

---

## Entity Relationship

```
users
  └── tenant_members (user_id)
  └── invitations    (invited_by)
  └── audit_logs     (actor_id)

tenants
  └── tenant_members (tenant_id)
  └── roles          (tenant_id)
  └── invitations    (tenant_id)
  └── audit_logs     (tenant_id)

roles
  └── tenant_members (role_id)
  └── invitations    (role_id)

invitations  →  creates →  tenant_members (on acceptance)
```

---

## How to Use This in a New SaaS

1. **Copy this schema** into your Supabase / PostgreSQL project
2. **Seed default roles** (admin, editor, viewer) when a new tenant is created
3. **Every API route** should check `tenant_members` to verify the user's role
4. **Every data table** you create should have a `tenant_id` column
5. **Log every mutation** (create, update, delete) to `audit_logs`

### Adding Your App's Tables

```sql
-- Example: marble inventory table for a marble business SaaS
CREATE TABLE marble_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),  -- always add this
  name        TEXT NOT NULL,
  quantity    INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

> ✅ Always attach `tenant_id` to every business table so data is isolated per client.

---

*Schema document — reusable foundation for multi-tenant SaaS products*
