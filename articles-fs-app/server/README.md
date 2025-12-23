# Server setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Configure the database**
   - Create a PostgreSQL database (default name in `.env.example` is `articles_fs`).
   - Copy `.env.example` to `.env` and update `DATABASE_URL`, `PORT`, and attachment directories as needed.
3. **Run the migrations**
   ```bash
   pnpm migrate
   ```
   This uses `sequelize-cli` and the config defined in `.sequelizerc`.
4. **Start the API**
   ```bash
   pnpm dev             
   pnpm build && pnpm start    
   ```

Attachments live in `data/uploads` (configurable via `.env`), while article metadata is stored in PostgreSQL.

## Authentication

API routes now require a JWT. Set `JWT_SECRET` (and optionally `JWT_EXPIRES_IN`, defaults to `1h`) in `.env`. Use:

- `POST /api/auth/register` with `{ email, password }`
- `POST /api/auth/login` with `{ email, password }`

Include the returned token as `Authorization: Bearer <token>` on all `/api/articles` and `/api/workspaces` requests.

## Architecture notes

The document `docs/architecture.md` captures the additional specification covering service design, infrastructure blueprint, and observability standards. Keep it updated when adding new services or changing deployment assumptions.

## What changed

- Articles now belong to a workspace (`workspaces` table) and include a `workspaceId` column.
- Comments are stored in a separate `comments` table and are returned when fetching an article.
- Workspaces and comments both expose CRUD-style endpoints (see `/api/workspaces` and `/api/articles/:id/comments`).
- Articles are versioned: every update creates a new version (see `/api/articles/:id?version=2` and `/api/articles/:id/versions`). Existing data is migrated to version 1.

Run the latest migrations to create the new tables/columns:

```bash
pnpm migrate
```
