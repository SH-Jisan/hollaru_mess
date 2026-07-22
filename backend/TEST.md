# 🧪 Meal Book Backend - Master A-to-Z Professional Testing Guide

This guide provides a comprehensive, step-by-step testing manual to verify every module, API endpoint, security guard, background queue, and performance metric of the **Meal Book Backend Server**.

---

## 📋 Table of Contents
1. [Pre-Requisites & Environment Setup](#1-pre-requisites--environment-setup)
2. [Automated Unit Testing](#2-automated-unit-testing)
3. [Interactive API Testing (Swagger / cURL)](#3-interactive-api-testing-swagger--curl)
   - [Phase 1: Authentication Module](#phase-1-authentication-module)
   - [Phase 2: Mess Management Module](#phase-2-mess-management-module)
   - [Phase 3: Daily Meals Engine](#phase-3-daily-meals-engine)
   - [Phase 4: Bazaar & Billing Engine](#phase-4-bazaar--billing-engine)
   - [Phase 5: Push Notifications Module](#phase-5-push-notifications-module)
4. [System Observability & Monitoring Dashboard](#4-system-observability--monitoring-dashboard)
5. [Load & Stress Performance Testing](#5-load--stress-performance-testing)

---

## 1. Pre-Requisites & Environment Setup

Before running tests, ensure your local development server is running and connected to Supabase PostgreSQL & Upstash Redis.

```bash
# 1. Open Terminal and navigate to backend folder
cd backend

# 2. Start the development server
npm run start:dev
```

Expected Terminal Startup Output:
```text
[Bootstrap] 🍲 MEAL BOOK BACKEND SERVER STARTED SUCCESSFULLY 🍲
[Bootstrap] 🚀 Server Listening  : http://localhost:3000
[Bootstrap] 📚 Swagger API Docs   : http://localhost:3000/api/docs
[Bootstrap] 📊 Metrics Dashboard  : http://localhost:3000/system/dashboard
```

---

## 2. Automated Unit Testing

NestJS comes with **Jest** for automated unit and integration tests.

### Execution Command:
```bash
npm run test
```

### Expected Output:
```text
 PASS  src/common/prisma/prisma.service.spec.ts
 PASS  src/app.controller.spec.ts

Test Suites: 2 passed, 2 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        2.321 s
Ran all test suites.
```
* **Success Criteria**: All Test Suites report `PASS` with 0 failures.

---

## 3. Interactive API Testing (Swagger / cURL)

Open your browser and navigate to: **`http://localhost:3000/api/docs`**

---

### Phase 1: Authentication Module

#### Step 1.1: Register a New Manager User
* **Method**: `POST`
* **URL**: `http://localhost:3000/auth/register`
* **Request Body**:
```json
{
  "email": "manager@test.com",
  "password": "Password123!",
  "fullName": "Jisan Manager",
  "phone": "01711000000"
}
```
* **Expected HTTP Status**: `201 Created`
* **Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "email": "manager@test.com",
    "fullName": "Jisan Manager",
    "role": "MANAGER"
  }
}
```

#### Step 1.2: Login User & Obtain Bearer Tokens
* **Method**: `POST`
* **URL**: `http://localhost:3000/auth/login`
* **Request Body**:
```json
{
  "email": "manager@test.com",
  "password": "Password123!"
}
```
* **Expected HTTP Status**: `200 OK`
* **Expected Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "cm...",
      "email": "manager@test.com"
    }
  }
}
```
> 🔑 **Copy the `accessToken`**. In Swagger UI, click **Authorize** at the top right and paste the token.

---

### Phase 2: Mess Management Module

#### Step 2.1: Create a Mess
* **Header**: `Authorization: Bearer <accessToken>`
* **Method**: `POST`
* **URL**: `http://localhost:3000/mess`
* **Request Body**:
```json
{
  "name": "Dream Mess Haven",
  "address": "Dhanmondi 32, Dhaka"
}
```
* **Expected HTTP Status**: `201 Created`
* **Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "mess_123...",
    "name": "Dream Mess Haven",
    "code": "4921",
    "managerId": "cm..."
  }
}
```
> 📝 **Note down the 4-digit `code`** (e.g. `4921`).

#### Step 2.2: List Mess Members
* **Header**: `Authorization: Bearer <accessToken>`
* **Method**: `GET`
* **URL**: `http://localhost:3000/mess/members`
* **Expected HTTP Status**: `200 OK`
* **Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm...",
      "fullName": "Jisan Manager",
      "role": "MANAGER"
    }
  ]
}
```

---

### Phase 3: Daily Meals Engine

#### Step 3.1: Get Live Meal Status
* **Header**: `Authorization: Bearer <accessToken>`
* **Method**: `GET`
* **URL**: `http://localhost:3000/meals/live`
* **Expected HTTP Status**: `200 OK`
* **Expected Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-07-22",
    "totalActiveMeals": 1,
    "members": [
      {
        "userId": "cm...",
        "status": "ON",
        "guestMeals": 0
      }
    ]
  }
}
```

#### Step 3.2: Submit Meal Request (Toggle OFF or Add Guest Meals)
* **Header**: `Authorization: Bearer <accessToken>`
* **Method**: `POST`
* **URL**: `http://localhost:3000/meals/request`
* **Request Body**:
```json
{
  "targetDate": "2026-07-23",
  "status": "OFF",
  "guestMeals": 2,
  "note": "Going home for weekend"
}
```
* **Expected HTTP Status**: `201 Created`
* **Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "req_01...",
    "status": "PENDING",
    "note": "Going home for weekend"
  }
}
```

---

### Phase 4: Bazaar & Billing Engine

#### Step 4.1: Add Bazaar Entry
* **Header**: `Authorization: Bearer <accessToken>`
* **Method**: `POST`
* **URL**: `http://localhost:3000/bazaar`
* **Request Body**:
```json
{
  "amount": 1500,
  "category": "VEGETABLES_MEAT",
  "description": "Rice, Chicken and Vegetables"
}
```
* **Expected HTTP Status**: `201 Created`

#### Step 4.2: Get Monthly Billing Summary & Dues Sheet
* **Header**: `Authorization: Bearer <accessToken>`
* **Method**: `GET`
* **URL**: `http://localhost:3000/billing/summary`
* **Expected HTTP Status**: `200 OK`
* **Expected Response**:
```json
{
  "success": true,
  "data": {
    "totalBazaarCost": 1500,
    "totalMeals": 30,
    "mealRate": 50,
    "memberSummaries": []
  }
}
```

---

### Phase 5: Push Notifications Module

#### Step 5.1: Save FCM Token
* **Header**: `Authorization: Bearer <accessToken>`
* **Method**: `POST`
* **URL**: `http://localhost:3000/notifications/token`
* **Request Body**:
```json
{
  "fcmToken": "sample_fcm_token_xyz_123"
}
```
* **Expected HTTP Status**: `201 Created`

---

## 4. System Observability & Monitoring Dashboard

Navigate to: **`http://localhost:3000/system/dashboard`**

### Verification Checklist:
- [x] **Server Uptime**: Displays continuous running time in days, hours, and seconds.
- [x] **Heap Memory Used**: Shows live Process RAM heap allocation in MB.
- [x] **Database Latency**: Reports Supabase PostgreSQL ping (e.g. `12 ms`) and `HEALTHY` status.
- [x] **BullMQ Queue Status**: Shows active, waiting, and completed background jobs count.
- [x] **Live Memory Leak Graph**: Line chart plots Heap Used vs RSS over time.
- [x] **Per-Route Swagger Accordion View**: Every API route displays total calls, success/failure count, average latency (`⚡ ms`), average RAM (`🧠 MB`), average CPU (`⚙️ ms`), and live latency curve.

---

## 5. Load & Stress Performance Testing

Test how the backend handles high concurrent traffic under load.

### Command (100 Concurrent Connections for 5 Seconds):
```bash
npx autocannon -c 100 -d 5 http://localhost:3000/system/status
```

### Expected Professional Benchmark:
```text
Running 5s test @ http://localhost:3000/system/status
100 connections

┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬──────────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max      │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼──────────┤
│ Latency │ 1 ms │ 3 ms │ 12 ms │ 25 ms │ 4.52 ms │ 6.12 ms │ 48.12 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴──────────┘

Stat         Avg      Stdev     Max
Req/Sec      1240     180       1510
Bytes/Sec    850 kB   120 kB    1.02 MB

6.2k requests in 5.05s, 4.25 MB read
```

* **Pass Criteria**:
  - `Req/Sec`: > 1,000 requests per second.
  - `Average Latency`: < 10 ms.
  - `0 Non-2xx Responses`: No 500 server crashes under load!

---

## 🏆 Final Audit Certification
Once all test phases pass cleanly, your **Meal Book Backend** is verified as **100% Secure, High-Performance, and Production-Ready**!
