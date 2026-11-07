# Deployment Guide – Smart CRM, Warranty Ticket Intake (flow L2)

Version **1.0.0** · Git tag `v1.0` · Repository: https://github.com/Tolexengnaa/237480201is11-warranty-app

The system is a Node.js 22 web application (UI + REST API on one port) with a PostgreSQL 16 database. Docker Compose starts both, creates the schema, loads sample data and reports health. **After cloning, the system starts with one command.**

## 1. Environment requirements

| Item | Requirement |
|---|---|
| Operating system | Windows 10/11 (64-bit) with WSL 2, macOS 13+, or Linux x86-64 / arm64 |
| Docker | Docker Desktop **4.30+** (Windows/macOS) or Docker Engine **24+** with the Compose **v2** plugin. Check: `docker --version` and `docker compose version` |
| Git | Any recent version, to clone the repository |
| Disk space | About **1 GB** free (base images `node:22-alpine` and `postgres:16-alpine`, the app image, and the database volume) |
| Free port | **3000** on the host (UI + API). The database port is not published to the host, so a local PostgreSQL on 5432 does not conflict |
| Network | Internet access the first time, to pull the two base images and npm packages |

Running without Docker is also possible (Node.js 22 LTS + PostgreSQL 16); see the appendix at the end.

## 2. Steps to build and run

Run each command from a terminal (PowerShell, Terminal, or bash).

```bash
# Step 1 – get the code at the submitted version (not counted as a deployment command)
git clone --branch v1.0 https://github.com/Tolexengnaa/237480201is11-warranty-app.git
cd 237480201is11-warranty-app

# Step 2 – build and start everything (database, migration, sample data, app)
docker compose up -d --build
```

That is all. On start the `app` container runs, in order: `npm run migrate` (creates tables; skipped if already done) → `npm run seed` (loads sample data; no duplicates on re-run) → `npm start`. The first build takes about 1–3 minutes depending on the network.

No `.env` file is needed for Docker. Copying `.env.example` to `.env` is harmless: Compose only reads `SECRET_KEY` from it (see section 3).

Stop and clean up:

```bash
docker compose down        # stop, keep the data
docker compose down -v     # stop and delete the database volume (fresh start next time)
```

## 3. Environment variables

Docker Compose sets these for the `app` service in `docker-compose.yml`. When running without Docker, put them in `.env` (template: `.env.example`).

| Variable | Meaning | Example value | Required |
|---|---|---|---|
| `DB_HOST` | Database host name. In Docker it is the service name `db`, not `localhost` | `db` (Docker) · `localhost` (local) | Yes |
| `DB_PORT` | Database port | `5432` | No – default `5432` |
| `DB_NAME` | Database name | `smartcrm` | Yes – app stops with a clear message if missing |
| `DB_USER` | Database user | `smartcrm` | Yes – app stops with a clear message if missing |
| `DB_PASSWORD` | Database password | `smartcrm` (development only) | No – default empty |
| `APP_PORT` | Port of the UI + API inside the container / on the machine | `3000` | No – default `3000` |
| `SECRET_KEY` | Key that signs login tokens (JWT). **Leave empty** to let the app generate a random 256-bit key at each start (users log in again after a restart). To keep sessions across restarts, set a value of **at least 32 characters**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Known public values and short keys are refused at start-up | *(empty)* | No |
| `TOKEN_EXPIRES_IN` | Token lifetime | `8h` | No – default `8h` |

The database container uses `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` = `smartcrm`. These are development defaults for a database that is only reachable inside the Docker network; change them before any real deployment.

## 4. Sample data

`npm run seed` (run automatically by the `app` container at every start) loads the data below with `ON CONFLICT DO NOTHING`, so running it again never creates duplicates.

| Table | Rows after seed | Content |
|---|---|---|
| `issue_category` | 7 | SCREEN, BATTERY, POWER, CHARGING, SOFTWARE, WATER, OTHER |
| `staff` | 5 | `tn1` Receptionist · `dp1` Coordinator · `kt1`, `kt2` Technicians · `kt3` Technician (locked, to show BR5) |
| `customer` | 3 | phones `0901234567`, `0912345678`, `0987654321` |
| `device` | 3 | IMEI `356789012345678` (warranty to 2027-03-15), `359876543210987` (warranty ended 2026-01-01), `351234567890123` (to 2027-06-30) |
| `ticket` | 0 | Tickets are created through the UI or API |

All sample accounts share the password **`Matkhau@123`** – for development and grading only; change or remove them before real use.

Check the counts:

```bash
docker compose exec db psql -U smartcrm -d smartcrm -c "SELECT (SELECT count(*) FROM issue_category) AS categories, (SELECT count(*) FROM staff) AS staff, (SELECT count(*) FROM customer) AS customers, (SELECT count(*) FROM device) AS devices;"
```

Expected: `categories 7 | staff 5 | customers 3 | devices 3`.

## 5. How to verify the system is running correctly

| # | Command / action | Expected result |
|---|---|---|
| 1 | `docker compose ps` | Two services, `db` and `app`, both with status **`Up … (healthy)`**. `app` becomes healthy only when `/health` answers and the database is reachable (allow up to ~30 s after start) |
| 2 | `curl http://localhost:3000/health` (Windows PowerShell: `curl.exe http://localhost:3000/health`) | `{"status":"ok","db":"up"}` |
| 3 | `docker compose logs app` | Contains `đã chạy 001_init_schema.sql` (first start) or `bỏ qua 001_init_schema.sql (đã chạy)`, then `seed xong: { issue_category: 7, staff: 5, customer: 3, device: 3 }` and `warranty-app đang chạy tại http://localhost:3000` |
| 4 | Open http://localhost:3000 in a browser and log in as `tn1` / `Matkhau@123` | Ticket list screen (M2) opens; with no ticket yet it shows the empty state "Chưa có phiếu bảo hành nào…" |
| 5 | `docker compose exec app npm test` | Ends with `# tests 49`, `# pass 49`, `# fail 0` (34 unit + 3 integration + 12 API tests, TC-01 → TC-12). Tests create and delete their own data |
| 6 | Re-run check: `docker compose restart app`, wait until healthy, then run the count query of section 4 again | Log shows `bỏ qua 001_init_schema.sql (đã chạy)`; counts unchanged: `7 | 5 | 3 | 3` |
| 7 | End-to-end flow in the UI: `tn1` creates a ticket for phone `0901234567`, IMEI `356789012345678` → log out → `dp1` classifies it (priority High) and assigns `Võ Lan` → `kt2` opens it and presses "Xác nhận nhận phiếu" | Ticket goes `NEW → CLASSIFIED → ASSIGNED → IN_PROGRESS`; the history panel shows 4 rows |

To see each test case with its actual result (used for the Test Report screenshots): `docker compose exec app npm run test:tc`.

---

### Appendix – running without Docker

Requirements: Node.js **22 LTS**, PostgreSQL **16** with a database and user created, e.g. `CREATE USER smartcrm WITH PASSWORD 'smartcrm'; CREATE DATABASE smartcrm OWNER smartcrm;`.

```bash
cp .env.example .env        # then edit DB_* to match your PostgreSQL; leave SECRET_KEY empty or set ≥ 32 chars
npm ci
npm run migrate
npm run seed
npm start                   # or: npm run start:open  (also opens the browser)
npm test                    # in a second terminal: 49 tests must pass
```
