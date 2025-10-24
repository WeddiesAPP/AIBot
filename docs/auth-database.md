# Database-backed authentication

This project can load authentication users from a Postgres database instead of the `AUTH_USERS` JSON environment variable. It is designed for Vercel deployments but works with any Postgres instance as long as the standard connection environment variables are available.

## 1. Enable the feature

Set these environment variables (locally in `.env.local` and in Vercel):

```bash
AUTH_MODE=database
# Optional when using a different schema/table name
# AUTH_USERS_TABLE=my_schema.my_auth_users
AUTH_SECRET=replace-with-a-long-random-string
POSTGRES_URL=...
# or the standard Vercel Postgres variables such as POSTGRES_PRISMA_URL, etc.
```

When `AUTH_MODE` is `database`, middleware assumes authentication is enabled as long as `AUTH_SECRET` is present. All user lookup logic will go through Postgres.

## 2. Provision the table

Create a Vercel Postgres database (only needs to be done once):

```bash
npx vercel postgres create
```

Pull the newly generated environment variables into your local `.env.local`:

```bash
npx vercel env pull .env.local
```

Run the migration in `db/migrations/001_create_auth_users.sql` using the interactive shell, or execute the helper script locally (it reads `.env.local` automatically):

```bash
# Option A: open a SQL shell and run the file
npx vercel postgres connect < db/migrations/001_create_auth_users.sql

# Option B: run the helper script from your machine
npm run db:setup
```

The migration creates an `auth_users` table with the columns the app expects. You can rename the table (and/or schema) by setting `AUTH_USERS_TABLE`.

### Using Supabase

If you prefer Supabase over Vercel Postgres, paste the `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` values from the Supabase dashboard into `.env.local`. The helper scripts (`npm run db:setup` / `npm run db:seed`) automatically relax TLS verification for `*.supabase.com` hosts so you do not need to install the Amazon RDS CA locally. In production you should provide the appropriate CA certificate and set `NODE_TLS_REJECT_UNAUTHORIZED=1` again.

## 3. Seed users

Insert users with hashed passwords (bcrypt):

```sql
INSERT INTO auth_users (username, password_hash, company, dashboard_path, label, project_id)
VALUES (
  'janedoe',
  '$2b$12$rGic3...hashed password...',
  'finance-rbbls',
  '/dashboard/finance-rbbls',
  'Finance RBBLS',
  'proj_123'
);
```

Generate bcrypt hashes with e.g. Node:

```bash
node -e "console.log(require('bcryptjs').hashSync('my-password', 12))"
```

Or use the helper script, which hashes for you and upserts the record using the Vercel connection string:

```bash
npm run db:seed -- --username finance --password "finance-demo" --company finance --projectId proj_finance
```

Only active users are returned; set `is_active = FALSE` to disable accounts without deleting them.

## 4. Deploy

Push the code, sync the new dependencies (`npm install`), and redeploy on Vercel. The app automatically uses the database in all server actions and session validation.

If you fall back to the `.env` JSON approach, remove `AUTH_MODE=database` (or set it to `env`) and the previous behaviour is restored.
