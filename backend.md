# Meal Book Backend - Architecture & Stack Blueprint

This document defines the official technology stack, database schema, and project folder structure for the **Meal Book** backend rebuild. Follow this blueprint to implement a secure, scalable, and production-grade NestJS application.

---

## 🛠️ 1. Technology Stack

| Category | Technology | Role in Production |
| :--- | :--- | :--- |
| **Language** | **TypeScript** | Enforces static typing, modern JavaScript features, and maintainability. |
| **Framework** | **NestJS** | Provides modular architecture, dependency injection, and scalable routing. |
| **Database** | **PostgreSQL** | Relational SQL database for robust transaction handling and financial computations. |
| **ORM** | **Prisma ORM** | Schema definition, automatic SQL migrations, and type-safe query building. |
| **Caching** | **Redis** | In-memory storage for caching meal deadlines, rate-limiting, and sessions. |
| **Authentication** | **Passport JWT & Bcrypt** | Standard JWT authentication with refresh token strategy and bcrypt password hashing. |
| **Task Queue** | **BullMQ + Redis** | Background jobs processing (email delivery, push notification queuing). |
| **API Documentation**| **Swagger / OpenAPI** | Interactive API testing playground auto-generated at `/api/docs`. |
| **Containerization** | **Docker & Compose** | Simplifies local development and production orchestration. |

---

## 📂 2. Project Folder Structure

Follow this modular directory layout in NestJS to keep the codebase clean and avoid cross-module coupling:

```text
meal-book-backend/
├── prisma/                            # Database Config
│   ├── schema.prisma                  # Prisma Relational Schema
│   └── migrations/                    # SQL Database Version Control
│
├── src/
│   ├── main.ts                        # Bootstrap app (Swagger, CORS, Helmet, GlobalPipes)
│   ├── app.module.ts                  # Root App Module
│   │
│   ├── common/                        # Global Shared Infrastructure
│   │   ├── decorators/
│   │   │   ├── get-user.decorator.ts  # Custom decorator to extract current user from request
│   │   │   └── roles.decorator.ts     # Metadata role tagging (@Roles('manager'))
│   │   ├── dto/
│   │   │   └── pagination.dto.ts      # Shared pagination filter (page, limit)
│   │   ├── exceptions/
│   │   │   └── http-exception.filter.ts # Global standardized JSON error formatter
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts      # Protects routes via JWT validation
│   │   │   └── roles.guard.ts         # Restricts routes based on user roles
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts # Wraps all success APIs in { success: true, data: ... }
│   │   └── prisma/
│   │       ├── prisma.module.ts       # Global Prisma Client Provider
│   │       └── prisma.service.ts
│   │
│   ├── config/                        # Global Environment Configuration
│   │   ├── app.config.ts              # Stores Port, JWT Secrets, Redis configs
│   │   └── env.validation.ts          # Throws error if .env has missing variables
│   │
│   └── modules/                       # Feature Modules (Enclosed domains)
│       ├── auth/                      # Authentication & Session Module
│       │   ├── dto/                   # login.dto.ts, register.dto.ts
│       │   ├── auth.controller.ts     # /auth/login, /auth/register
│       │   ├── auth.service.ts        # Signs JWTs, verifies passwords
│       │   └── strategies/
│       │       └── jwt.strategy.ts    # Validates authorization headers
│       │
│       ├── mess/                      # Mess creation, Join codes, Member lists
│       │   ├── dto/
│       │   ├── mess.controller.ts
│       │   └── mess.service.ts
│       │
│       ├── meals/                     # Daily Logs, Lock timers, Meal Off & Guest Requests
│       │   ├── dto/                   # update-meal.dto.ts, request-meal-off.dto.ts
│       │   ├── meals.controller.ts
│       │   └── meals.service.ts       # Enforces lock windows (Lunch/Dinner cutoffs)
│       │
│       ├── bazaar/                    # Shared Grocery Expenses & Deposits
│       │   ├── dto/
│       │   ├── bazaar.controller.ts
│       │   └── bazaar.service.ts      # Handles deposits and bazaar item statuses
│       │
│       └── billing/                   # Dynamic calculations & month closure reports
│           ├── billing.controller.ts  # /billing/summary/:monthId
│           └── billing.service.ts     # Computes Meal Rate = totalCost/totalMeals in database
│
├── Dockerfile                         # Multi-stage production build script
├── docker-compose.yml                 # Local database stack (PostgreSQL + Redis)
├── .env.example                       # Shared placeholder environment keys
└── tsconfig.json                      # Compiler options
```

---

## 🗄️ 3. Relational Database Schema (Prisma)

Write the following model declarations inside your `prisma/schema.prisma` file:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  MEMBER
  MANAGER
}

enum MealStatus {
  OPEN
  COOKING
  CANCELLED
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  phone     String?
  role      Role     @default(MEMBER)
  messId    String?
  mess      Mess?    @relation(fields: [messId], references: [id], onDelete: SetNull)
  deposits  Deposit[]
  requests  MealRequest[]
  createdAt DateTime @default(now())
}

model Mess {
  id               String         @id @default(uuid())
  name             String
  code             String         @unique
  managerId        String
  members          User[]
  isMonthActive    Boolean        @default(false)
  currentMonthId   String?
  monthlyData      MonthlyData[]
  requestStartTime String         @default("17:00") // Time to open next day requests
  lunchEndTime     String         @default("02:00") // Cutoff for Lunch modifications
  dinnerEndTime    String         @default("12:00") // Cutoff for Dinner modifications
  createdAt        DateTime       @default(now())
}

model MonthlyData {
  id              String       @id @default(uuid())
  monthName       String       // e.g., "July 2026"
  messId          String
  mess            Mess         @relation(fields: [messId], references: [id], onDelete: Cascade)
  isClosed        Boolean      @default(false)
  totalBazaarCost Float        @default(0.0)
  dailyLogs       DailyLog[]
  bazaarItems     BazaarItem[]
  deposits        Deposit[]
  createdAt       DateTime     @default(now())
}

model DailyLog {
  id            String         @id @default(uuid()) // Date formatted as string: YYYY-MM-DD
  monthId       String
  month         MonthlyData    @relation(fields: [monthId], references: [id], onDelete: Cascade)
  lunchCount    Int            @default(0)
  lunchStatus   MealStatus     @default(OPEN)
  lunchCancelledBy String?
  dinnerCount   Int            @default(0)
  dinnerStatus  MealStatus     @default(OPEN)
  dinnerCancelledBy String?
  requests      MealRequest[]
  createdAt     DateTime       @default(now())
}

model MealRequest {
  id          String         @id @default(uuid())
  logId       String
  log         DailyLog       @relation(fields: [logId], references: [id], onDelete: Cascade)
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String         // "LUNCH" or "DINNER"
  category    String         // "OFF" or "GUEST"
  count       Int            @default(1) // 1 for OFF, X for Guests
  status      RequestStatus  @default(PENDING)
  createdAt   DateTime       @default(now())
}

model BazaarItem {
  id           String        @id @default(uuid())
  monthId      String
  month        MonthlyData   @relation(fields: [monthId], references: [id], onDelete: Cascade)
  items        String
  cost         Float         @default(0.0)
  status       String        @default("PENDING") // PENDING or COMPLETED
  shopperId    String?
  shopperName  String?
  createdAt    DateTime      @default(now())
}

model Deposit {
  id         String          @id @default(uuid())
  monthId    String
  month      MonthlyData     @relation(fields: [monthId], references: [id], onDelete: Cascade)
  userId     String
  user       User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount     Float
  createdAt  DateTime        @default(now())
}
```

---

## 🔒 4. Key Production Design Patterns

### A. Database Transactions (Atomic Operations)
When a manager approves a meal request, ensure that the request status updates and the meal count changes atomically inside a Prisma transaction:

```typescript
// meals.service.ts
async approveRequest(requestId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Get request
    const request = await tx.mealRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { log: true }
    });

    if (request.status !== 'PENDING') throw new BadRequestException('Already processed');

    // 2. Update request status
    await tx.mealRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' }
    });

    // 3. Update count in daily log
    const countField = request.type === 'LUNCH' ? 'lunchCount' : 'dinnerCount';
    const decrement = request.category === 'OFF' ? 1 : -request.count;
    
    await tx.dailyLog.update({
      where: { id: request.logId },
      data: {
        [countField]: {
          increment: -decrement // Subtracting positive decrements or adding guests
        }
      }
    });
  });
}
```

### B. Standardized JSON Error Output
Ensure your `HttpExceptionFilter` in `src/common/exceptions/` captures all errors and maps them to a consistent structure:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.getResponse();

    response.status(status).json({
      success: false,
      statusCode: status,
      message: typeof message === 'object' ? (message as any).message : message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### C. Docker Local Development Environment
Use the following `docker-compose.yml` to spin up your databases and cache instantly during local development:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: meal_book_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: mysecretpassword
      POSTGRES_DB: meal_book
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: meal_book_cache
    restart: always
    ports:
      - "6379:6379"

volumes:
  pgdata:
```
