# thai-pila-api

Backend API for the THAI PILA project (Express + TypeScript + PostgreSQL).

## Requirements

- [Node.js](https://nodejs.org/) 18 or later
- npm
- PostgreSQL 14 or later

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and update the values for your database:

```bash
cp .env.example .env
```

Important variables in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | API port | `3001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASS` | Database password | *(your password)* |
| `DB_NAME` | Database name | `thai_pila` |
| `JWT_SECRET` | Secret used to sign admin JWTs | a long random string |

You can also use `DATABASE_URL` instead of the individual `DB_*` variables:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/thai_pila
```

> **Do not commit `.env`** — it is already listed in `.gitignore`.

### 3. Start the server

Development mode (hot reload with nodemon):

```bash
npm run dev
```

Or:

```bash
npm run watch
```

Normal start:

```bash
npm start
```

The API will be available at [http://localhost:3001](http://localhost:3001).

### 4. Build TypeScript

```bash
npm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with nodemon |
| `npm run watch` | Watch files and re-run with ts-node |
| `npm start` | Run with ts-node |
| `npm run build` | Compile TypeScript |

## Security notes

- Keep `DB_PASS` and `JWT_SECRET` in `.env` only — never hardcode them.
- Before making the repository public, confirm no real credentials exist in the code or commit history.
