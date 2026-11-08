# 🥦 GroceReal

A modern full-stack food delivery application delivering fresh foods packed with nutrients directly to customers.

---

## Architecture & Tech Stack

GroceReal is built as a monorepo powered by **npm workspaces**:

- **Frontend (`apps/web`)**: Next.js (React), Tailwind CSS
- **Backend API (`apps/api`)**: NestJS, TypeScript, Passport JWT
- **Database & ORM**: PostgreSQL (Supabase) with Prisma ORM
- **Shared Package (`packages/shared`)**: Shared types, DTOs, and utility functions

---

## Project Structure

```text
GroceReal/
├── apps/
│   ├── api/            # NestJS Backend API (Port 3001)
│   │   ├── prisma/     # Database schema, migrations & seed script
│   │   └── src/        # Auth, Orders, Stores, Drivers, Users modules
│   └── web/            # Next.js Frontend Application (Port 3000)
├── packages/
│   └── shared/         # Shared TypeScript interfaces & types
├── .env.example        # Environment variables template
├── package.json        # Monorepo root package.json
└── README.md
```

---

## Prerequisites

Before setting up the project, make sure you have installed:
- **Node.js** (v18 or v20+ recommended): [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git**: [Download Git](https://git-scm.com/)
- A **PostgreSQL** database (e.g. [Supabase](https://supabase.com))

---

## 🚀 Step-by-Step Setup Guide

### 1. Clone the Repository

Open your terminal or command prompt and clone the repository:

```bash
git clone https://github.com/Nherf0310/GroceReal.git
```

Navigate into the project root directory using `cd`:

```bash
cd GroceReal
```

---

### 2. Set Up Environment Variables (`.env`)

A template file named `.env.example` is provided in the root folder. You need to create a `.env` file from it.

#### On Windows (PowerShell):
```powershell
Copy-Item .env.example .env
Copy-Item .env.example apps/api/.env
Copy-Item .env.example apps/web/.env
```

#### On macOS / Linux:
```bash
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/web/.env
```

#### Configure `.env` values:
Open `.env` in your text editor and fill in your PostgreSQL credentials:

```env
# Supabase PostgreSQL Connection Strings
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# JWT Secret for NestJS API
JWT_SECRET="grocereal_super_secret_jwt_key_change_in_production"
JWT_EXPIRES_IN="7d"

# Ports
PORT=3001
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

---

### 3. Install Dependencies

Install all dependencies across the monorepo from the root directory:

```bash
npm install
```
*(or simply `npm i`)*

---

### 4. Setup Prisma Database & Client

Generate the Prisma Client so TypeScript recognizes all database models:

```bash
npm run prisma:generate
```

Push or run migrations on your database:

```bash
npm run prisma:migrate
```

*(Optional)* Seed initial store, category, product, and delivery slot data:

```bash
npm run prisma:seed
```

---

## Running the Application

You can run both the API and Web applications using separate terminal tabs from the root directory.

### Terminal 1: Start the Backend API
From the root folder (`GroceReal`):
```bash
npm run dev:api
```
* Or navigate directly into the API directory using `cd`:
  ```bash
  cd apps/api
  npm run start:dev
  ```
* **API URL:** `http://localhost:3001/api/v1`

---

### Terminal 2: Start the Frontend Web App
From the root folder (`GroceReal`):
```bash
npm run dev:web
```
* Or navigate directly into the Web directory using `cd`:
  ```bash
  cd apps/web
  npm run dev
  ```
* **Web App URL:** `http://localhost:3000`

---

## 🔑 Demo & Test Accounts

You can log in to test role-based features (Customer, Store Manager, Driver) using the following credentials:

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@gmail.com` | `Password` | Browse fresh goods, manage cart, place orders, track delivery |
| **Store Manager** | `manager@gmail.com` | `Password` | Manage store inventory, accept/reject orders, pick items |
| **Driver** | `drivee@gmail.com` | `Password` | View assigned deliveries, update delivery progress & status |

> **Note:** If you run `npm run prisma:seed`, default demo accounts (`customer@grocereal.com`, `manager@grocereal.com`, `driver@grocereal.com`) with password `password123` are also populated.

---

##  Locating Folders with `cd` (Quick Reference)

If you need to work inside specific workspace folders:

```bash
# Return to root directory
cd GroceReal

# Go to Backend (API) folder
cd apps/api

# Go to Frontend (Web) folder
cd apps/web

# Go to Shared library folder
cd packages/shared

# Go back up one directory level
cd ..
```

---

##  Available NPM Scripts

Run these scripts from the project root (`GroceReal`):

| Command | Description |
| :--- | :--- |
| `npm i` | Installs all packages across workspaces |
| `npm run dev:api` | Runs the NestJS API in watch/dev mode (`http://localhost:3001`) |
| `npm run dev:web` | Runs the Next.js frontend in dev mode (`http://localhost:3000`) |
| `npm run build` | Builds all packages and applications |
| `npm run prisma:generate` | Generates the Prisma Client |
| `npm run prisma:migrate` | Runs database migrations |
| `npm run prisma:seed` | Populates database with sample test data |
| `npm run prisma:studio` | Opens Prisma Studio UI to view and edit database tables |

---

##  Troubleshooting

- **Error: `Property '...' does not exist on type 'PrismaService'` or `@prisma/client has no exported member`**
  Run:
  ```bash
  npm run prisma:generate
  ```
  This regenerates `@prisma/client` types from `apps/api/prisma/schema.prisma`.

- **Error: `DATABASE_URL or DIRECT_URL is not defined in environment variables`**
  Ensure you have copied `.env.example` to `.env` in the root folder and in `apps/api/.env`, and configured your database connection string.
