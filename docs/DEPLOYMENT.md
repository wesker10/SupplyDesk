# SupplyDesk Deployment Notes

These notes describe the current production deployment used for SupplyDesk.

## Production environment

| Item | Value |
|---|---|
| Host | `192.168.100.41` |
| App path | `/opt/talabati` |
| PM2 app | `talabati` |
| Database | PostgreSQL 18 |
| Database container | `talabati-postgres` |
| Default port | `3000` |
| Reverse proxy | Nginx on port `80` |

The runtime service names still use the original internal project slug for compatibility. The product name shown to users and in the repository is **SupplyDesk**.

## Docker Compose deployment

For a self-contained install, Docker Compose starts both SupplyDesk and PostgreSQL:

```bash
cp .env.example .env
# Optional: edit .env and change POSTGRES_PASSWORD before shared/server use
docker compose up -d
curl -fsS http://127.0.0.1:3000/api/health
```

The default `docker-compose.yml` uses the published image `ghcr.io/wesker10/supplydesk` and starts PostgreSQL automatically. PostgreSQL stores data in the `supplydesk_postgres_data` Docker volume mounted at `/var/lib/postgresql` for PostgreSQL 18 compatibility. Users do not need to install PostgreSQL separately when using Docker Compose.

## Development source-build compose

Use this only when building the image locally from the repository:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## Deploy / restart

```bash
cd /opt/talabati
npm install
npm test
npm run build
pm2 restart talabati --update-env
curl -fsS http://127.0.0.1:3000/api/health
```

Expected health response:

```json
{"ok":true}
```

## Production checks

```bash
pm2 status talabati
curl -fsS http://127.0.0.1/api/health
curl -fsS http://127.0.0.1:3000/api/health
```

## Security notes

- Do not commit tokens, passwords, `.env*`, `secrets/`, `data/`, `backups/`, database files, or dumps.
- The production database credentials are provided through the PM2 ecosystem configuration and server-side secret files.
- Use temporary credentials only when needed, then revoke them.
- If authentication is disabled temporarily for visual QA or screenshots, restore the previous value immediately after testing.

## Screenshot hygiene

Repository screenshots must use neutral demo data only. Do not capture real production records, private names, client data, tokens, or operational secrets.
