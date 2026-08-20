# Acme Corp workspace

Project management app built with Next.js 16 (App Router), Tailwind v4, Prisma 7 on MySQL,
and Auth.js (NextAuth v5) for role-based access.

## Setup

You need a MySQL 8 (or MariaDB) server. Nothing else is required.

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — e.g. `mysql://root:password@localhost:3306/projectmanagementapp`
- `AUTH_SECRET` — generate with `npx auth secret`
- `SEED_PASSWORD` — the password every seeded demo account gets (8+ characters)

Create the database, apply the schema, and seed the demo accounts:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

Then start the app:

```bash
npm run dev
```

Sign in at `/signin` with any seeded address — `alex@company.com` (Owner),
`sarah@company.com` (Admin), `emma@company.com` (Manager), `mike@company.com` (Member),
`david@company.com` (Viewer), `client@external.com` (Guest) — and your `SEED_PASSWORD`.
Each one lands on a different slice of the app, which is the quickest way to see the
permission matrix at work.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply a migration (dev) |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Upsert the six demo accounts |
| `npm run db:studio` | Browse the database |

## Authorization

Roles are `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`, `GUEST`.

- [`src/lib/permissions.ts`](src/lib/permissions.ts) is the single source of truth: a permission →
  roles matrix. The table rendered on `/settings` and every `can()` check read from it, so
  the documentation cannot drift from the enforcement.
- [`src/lib/session.ts`](src/lib/session.ts) is the data-access layer. `requireUser()` and
  `requirePermission()` verify the session on the server; every protected page and action
  calls one of them.
- [`src/proxy.ts`](src/proxy.ts) (this is Next 16's rename of `middleware.ts`) only checks whether a
  session cookie exists and redirects to `/signin` if not. It is an optimistic gate, never
  the authorization decision.

Sessions are JWTs — required by the credentials provider — so the role is stamped into the
token at sign-in. A role change therefore takes effect on the target's next session refresh,
not instantly; sign out and back in to force it.

### People screens

Grouped under **Administration** in the sidebar, which renders for owners and admins. The
roster is open to everyone, so non-admins get a Users link in the main navigation instead —
every role has exactly one route to it, never two.

| Route | Who sees it | Purpose |
| --- | --- | --- |
| `/admin/users` | Everyone signed in | The workspace roster: search, role/team/status filters, pagination. Owners and admins additionally get last sign-in, bulk enable/disable and Add user; owners get role editing and delete. |
| `/admin/users/new` | Owners, admins | Create an account — validated name, email, phone, password rules, role and rate |
| `/admin/users/roles` | Owners, admins | What each of the six roles grants, and who holds it |
| `/admin/teams` | Everyone signed in | Teams with membership, project count and progress. Owners and admins can create, edit and delete. |

`/team` and `/teams` were merged into `/admin/users` and `/admin/teams`, and both permanently
redirect there.

**A team cannot be deleted while it still has active users or owns projects.** Deleting one
would blank those rows' `teamId` silently (`onDelete: SetNull`), so the action refuses and
names what is in the way; the delete button is disabled with the same reason as a tooltip.
Disabled accounts do not block — they are already out of use. Move the users and projects to
another team first, which is what the owning-team selector on a project's settings is for.

Validation lives in [`src/lib/validations.ts`](src/lib/validations.ts) as zod schemas. Each one is
used twice — the form parses it for immediate feedback, and the server action parses the same
schema again, because that is the copy a client cannot skip. `z.infer` keeps the action's input
type tied to the schema.

## Project structure

Source lives under `src/`, with `@/*` mapped to `./src/*`.

```
src/
  app/         routes — (app) is the authenticated group, plus /signin and /forbidden
  components/  ui/ primitives, then one folder per feature area
  hooks/       shared client hooks
  lib/         auth, prisma, queries, actions, validations, domain types
  styles/      globals.css and the design tokens
  types/       ambient declarations (next-auth module augmentation)
prisma/        schema, migrations, seed script and seed data
```

## Data layer

Everything lives in MySQL — 14 tables covering accounts, teams, projects, tasks, time
entries, campaigns, landing sections, messages and activity.

- [`prisma/schema.prisma`](prisma/schema.prisma) is the schema. Durations are stored as
  **integer minutes** (`estimateMinutes`, `minutes`) so no total ever accumulates floating
  point drift; the query layer converts to hours for display.
- [`src/lib/domain.ts`](src/lib/domain.ts) holds the domain types, constants and pure date helpers.
  It has no I/O, so client components can import it freely.
- [`src/lib/queries.ts`](src/lib/queries.ts) is the read side. Each function is `cache()`d, so a page
  needing projects in three places issues one query per request.
- [`src/lib/actions.ts`](src/lib/actions.ts) is the write side. Every action calls
  `requirePermission()` before touching the database.
- [`src/lib/mappers.ts`](src/lib/mappers.ts) translates between the database's `SCREAMING_SNAKE`
  enums and the app's lowercase vocabulary (`IN_PROGRESS` ⇄ `"in-progress"`), so no
  storage-shaped value ever reaches a component.

Seed content lives in [`prisma/seed-data.ts`](prisma/seed-data.ts), keyed by natural
identifiers (email, project key, task key) rather than ids, which is what makes
`npm run db:seed` idempotent.
