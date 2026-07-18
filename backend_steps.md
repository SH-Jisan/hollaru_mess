# Meal Book Backend - Step-by-Step Implementation Guide

Follow this guide to build your production-grade NestJS and PostgreSQL backend systematically. Each step matches the specifications defined in [backend.md](file:///d:/app_dev/hollaru%20manager/backend.md).

---

## 🏁 Phase 1: Project Setup & Infrastructure (Steps 1–4)

### Step 1: Initialize NestJS Project
Make sure Node.js is installed, then install NestJS CLI globally and create a new project:
```bash
npm i -g @nestjs/cli
nest new meal-book-backend
# Choose your preferred package manager (npm is recommended)
```

### Step 2: Configure Docker Containers
Create a `docker-compose.yml` file in your project root using the configuration from `backend.md`. Launch the PostgreSQL and Redis services:
```bash
docker-compose up -d
```

### Step 3: Setup Prisma ORM
Install Prisma dependencies and initialize the configuration directory:
```bash
npm i -D prisma
npm i @prisma/client
npx prisma init
```
*Configure the `DATABASE_URL` inside your `.env` file to connect to your PostgreSQL docker container:*
`DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/meal_book?schema=public"`

---

## 🗄️ Phase 2: Database Modeling & Prisma Setup (Steps 4–7)

### Step 4: Write Database Schema
1. Open `prisma/schema.prisma`.
2. Replace its contents with the database models from Section 3 of `backend.md`.

### Step 5: Execute Initial Migration
Create and run your initial database migration to structure PostgreSQL tables:
```bash
npx prisma migrate dev --name init
```

### Step 6: Create Prisma Module in NestJS
Generate a global Prisma module and service to share database client instances:
```bash
nest g module common/prisma
nest g service common/prisma
```
*Inject the `PrismaClient` in `prisma.service.ts` so other services can query the database.*

---

## 🛡️ Phase 3: Core Security & Utilities Setup (Steps 7–10)

### Step 7: Implement Environment Config Validation
Install config package and class-validator to validate `.env` variables at runtime:
```bash
npm i @nestjs/config class-validator class-transformer
```
*Create `env.validation.ts` and validate database URLs, JWT keys, and ports.*

### Step 8: Setup Global Filters & Interceptors
1. Write `http-exception.filter.ts` in `src/common/exceptions/` to intercept errors and return standardized JSON error bodies.
2. Write `transform.interceptor.ts` in `src/common/interceptors/` to wrap success API responses.
3. Configure them globally in `src/main.ts` using `app.useGlobalFilters(...)` and `app.useGlobalInterceptors(...)`.

### Step 9: Configure Swagger API Docs
Install Swagger package:
```bash
npm i @nestjs/swagger
```
*Add Swagger bootstrapper to `src/main.ts` to expose the interactive API playground at `/api/docs`.*

---

## 🔑 Phase 4: Authentication & Security (Steps 10–13)

### Step 10: Generate Auth Module
Generate the auth module files:
```bash
nest g module modules/auth
nest g controller modules/auth
nest g service modules/auth
```

### Step 11: Setup Bcrypt & JWT
Install authentication packages:
```bash
npm i @nestjs/jwt passport-jwt passport @types/passport-jwt bcrypt @types/bcrypt
```
1. Write register and login endpoints inside `auth.service.ts` utilizing Bcrypt for password hashing.
2. Setup `jwt.strategy.ts` to parse JWT headers from incoming client requests.

### Step 12: Implement Guards & Decorators
1. Create `jwt-auth.guard.ts` to protect routes.
2. Create `roles.guard.ts` and `@Roles(...)` decorator to restrict access to Manager-only endpoints.
3. Create `@CurrentUser()` decorator to extract user data from JWT context easily.

---

## 🏠 Phase 5: Mess & Member Management (Steps 13–15)

### Step 13: Implement Mess Module
```bash
nest g module modules/mess
nest g controller modules/mess
nest g service modules/mess
```
*Implement:*
* `POST /mess` (Create mess: generates unique 4-digit code e.g., `MESS-1234`, updates creator's role to `MANAGER`).
* `POST /mess/join` (Join mess: queries mess by code, appends user to member list, updates user's role to `MEMBER`).
* `GET /mess/members` (List all members belonging to user's mess ID).

---

## 🍽️ Phase 6: Daily Meals Engine (Steps 15–17)

### Step 14: Implement Meals Module
```bash
nest g module modules/meals
nest g controller modules/meals
nest g service modules/meals
```
*Implement:*
* **Daily Log Initializer**: Auto-generates log on date `YYYY-MM-DD` with counts defaulted to total members.
* **Meal Off / Guest Request**: Saves requests under `MealRequest` table with state `PENDING`.
* **Lock Deadline Checkers**: Reads lock timings (`requestStartTime`, `lunchEndTime`, `dinnerEndTime`) and rejects updates if deadlines have passed.

### Step 15: Implement Transaction-safe Request Approval
* **Approve Endpoint**: Implements the `$transaction` pattern from Section 4 of `backend.md`. Approving a request updates its status to `APPROVED` and increments/decrements meal counts atomically inside the daily log.

---

## 💰 Phase 7: Expenses, Deposits & Billing (Steps 17–20)

### Step 16: Implement Bazaar & Deposits Module
```bash
nest g module modules/bazaar
nest g controller modules/bazaar
nest g service modules/bazaar
```
*Implement:*
* **Bazaar List**: Manager adds shopping items.
* **Purchase Completion**: Members complete a purchase, enter the cost in Taka, and increment the monthly billing `totalBazaarCost` field.
* **Deposits Logger**: Manager inputs deposit amounts for specific user IDs.

### Step 17: Implement Billing Calculations (Month Summary)
```bash
nest g module modules/billing
nest g controller modules/billing
nest g service modules/billing
```
*Implement:*
* **Sum Queries**: Use Prisma `aggregate` and `groupBy` to calculate total bazaar costs, member meals, and deposits in SQL.
* **Math Logic**:
  * `Meal Rate = Total Bazaar Cost / Total Meals`
  * `Member Balance = Member Deposit - (Member Meals * Meal Rate)`
* **Archive Endpoint**: Flags the monthly document as `isClosed = true` and updates mess `isMonthActive = false`.

---

## 🚀 Phase 8: Deployment & Production (Steps 20–22)

### Step 18: Build Production Image
Create a Dockerfile in your project root to build your multi-stage node runtime container. Test compilation:
```bash
docker build -t meal-book-backend .
```

### Step 19: Setup PM2 Monitoring & Nginx
On your production server (e.g., Ubuntu VPS), run your compiled backend inside **PM2** process manager:
```bash
pm2 start dist/main.js --name meal-book-api
```
Configure Nginx as a reverse proxy to direct traffic from port 80/443 (SSL) to your NestJS port (e.g., 3000).
