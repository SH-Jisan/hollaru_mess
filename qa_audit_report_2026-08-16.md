# 🕵️‍♂️ Senior QA Audit & Vulnerability Report

**Date of Audit:** August 16, 2026  
**Auditor Role:** Senior Software Quality Assurance (QA) Engineer  
**Target Application:** Meal Book Backend (`backend/`)  
**Overall Quality & Production Readiness Score:** `5.2 / 10`

---

## 📌 Executive Summary

This report documents critical bugs, security vulnerabilities, edge-case failures, and architectural drawbacks identified during the QA inspection of the [`backend/`](file:///d:/app_dev/hollaru%20manager/backend) codebase. These findings require resolution prior to production deployment to prevent cross-tenant data leaks, authentication bypasses, time-drift errors, and runtime failures.

---

## 🚨 1. BLOCKER & CRITICAL DATA INTEGRITY ISSUES

### 🔴 1.1 Multi-Tenant Data Collision in `DailyLog` Primary Key
* **Severity:** **BLOCKER (Data Corruption / Cross-Tenant Leak)**
* **Target Files:** [`schema.prisma`](file:///d:/app_dev/hollaru%20manager/backend/prisma/schema.prisma#L74) & [`meals.service.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/modules/meals/meals.service.ts#L127-L138)
* **Vulnerability Description:**
  In [`schema.prisma`](file:///d:/app_dev/hollaru%20manager/backend/prisma/schema.prisma#L74), `DailyLog` has a global primary key `id`. In [`meals.service.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/modules/meals/meals.service.ts#L127-L138), `getOrCreateDailyLog()` hardcodes `id` to the date string (e.g., `"2026-08-16"`):
  ```typescript
  // meals.service.ts (Line 127)
  let log = await this.prisma.dailyLog.findUnique({ where: { id: dateStr } });
  ```
* **Impact & QA Risk:**
  Because `id` is globally unique across the entire database, **all messes in the system share the exact same `DailyLog` record for a given day.** When Mess A creates a log for `"2026-08-16"`, Mess B querying `findUnique({ where: { id: "2026-08-16" } })` fetches **Mess A's record**. Members of Mess B will view and mutate Mess A's meal counts.
* **Remediation:**
  Refactor `DailyLog` schema to use a composite unique constraint `@@unique([monthId, id])` or rely on a standard UUID for `id` while storing `date` as an indexed column.

---

### 🔴 1.2 Global UTC Timezone Drift (Date Offset Bug)
* **Severity:** **CRITICAL (Business Logic Failure)**
* **Target File:** [`meals.service.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/modules/meals/meals.service.ts#L22)
* **Vulnerability Description:**
  Daily date strings are computed using UTC ISO conversion:
  ```typescript
  const todayStr = new Date().toISOString().split('T')[0];
  ```
* **Impact & QA Risk:**
  `toISOString()` calculates date based on UTC (GMT+0). For users operating in Bangladesh (UTC+6 / Asia/Dhaka):
  * Requests placed between **12:00 AM and 05:59 AM local time** evaluate to the **previous calendar day** in UTC.
  * Early morning meal requests will silently attach to yesterday's `DailyLog`, locking members out of today's meals.
* **Remediation:**
  Use timezone-aware date formatting (e.g., `dayjs().tz("Asia/Dhaka").format("YYYY-MM-DD")`) bound to local mess configuration.

---

## 🔒 2. SECURITY & AUTHENTICATION VULNERABILITIES

### 🟠 2.1 CAPTCHA Defense Fail-Open Vulnerability
* **Severity:** **HIGH (Authentication Bypass Risk)**
* **Target File:** [`auth.service.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/modules/auth/auth.service.ts#L105-L120)
* **Vulnerability Description:**
  The Cloudflare Turnstile verification helper catches errors and returns `true`:
  ```typescript
  // auth.service.ts (Line 116)
  } catch (err) {
    this.logger.error('Turnstile verification request failed:', err);
    return true; // Fail-safe to avoid blocking legitimate users on network timeout
  }
  ```
* **Impact & QA Risk:**
  If an attacker triggers an outbound HTTP bottleneck or Cloudflare API outage, Turnstile automatically fails open (`return true`). This allows botnets and automated credential-stuffing scripts to bypass CAPTCHA defense completely.
* **Remediation:**
  Fail closed (`return false`) or implement strict fallback rate-limiting per IP when third-party CAPTCHA validation fails.

---

### 🟠 2.2 Unhandled Async Refresh Token Persistence
* **Severity:** **HIGH (Session Sync Failure)**
* **Target File:** [`auth.service.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/modules/auth/auth.service.ts#L175)
* **Vulnerability Description:**
  In `login()`, `updateRefreshToken` is executed asynchronously without `await`:
  ```typescript
  this.updateRefreshToken(user.id, tokens.refreshToken).catch(() => {});
  ```
* **Impact & QA Risk:**
  If database write latency occurs or the connection drops during token update, the client receives `200 OK` with valid JWT tokens, but the database retains an empty or stale `hashedRefreshToken`. The user's subsequent `/auth/refresh` request will fail with `401 Unauthorized`.
* **Remediation:**
  Await token hash persistence before delivering authentication tokens to the client.

---

### 🟠 2.3 Missing RBAC Guards at Controller Layer
* **Severity:** **MEDIUM (API Governance Flaw)**
* **Target File:** [`meals.controller.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/modules/meals/meals.controller.ts#L23-L29)
* **Vulnerability Description:**
  The manager endpoint `@Patch('approve/:id')` lacks `@Roles(Role.MANAGER)` and `@UseGuards(RolesGuard)` annotations.
* **Impact & QA Risk:**
  Relying solely on service-layer checks (`validator.validateManager()`) bypasses NestJS route guard conventions and weakens defense-in-depth security.
* **Remediation:**
  Apply `@UseGuards(RolesGuard)` and `@Roles(Role.MANAGER)` to all manager-only controller methods.

---

## ⚡ 3. ARCHITECTURAL & EDGE-CASE FAILURES

### 🟡 3.1 Static Application Bootstrap Redis Failover
* **Severity:** **HIGH (Service Outage Risk)**
* **Target File:** [`app.module.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/app.module.ts#L55-L74)
* **Vulnerability Description:**
  Redis primary-to-secondary ping check runs **only once** at NestJS application startup:
  ```typescript
  // app.module.ts (Line 55)
  if (host && secondaryHost) { ... pingClient.ping() ... }
  ```
* **Impact & QA Risk:**
  If Primary Redis (`REDIS_HOST_1`) fails or hits rate limits **at runtime** (e.g., hours after startup), NestJS will not switch to `REDIS_HOST_2`. BullMQ job processing, caching, and rate limiting will crash until manual server reboot.
* **Remediation:**
  Use native Redis cluster or Sentinel connection pools with dynamic failover retry configuration.

---

### 🟡 3.2 Flawed Overnight Deadline Calculation Algorithm
* **Severity:** **HIGH (Business Logic Edge Case)**
* **Target File:** [`meals.service.ts`](file:///d:/app_dev/hollaru%20manager/backend/src/modules/meals/meals.service.ts#L142-L153)
* **Vulnerability Description:**
  `checkDeadline()` parses cutoff strings (`"02:00"`) and evaluates them via direct hour integer comparison:
  ```typescript
  if (currentHour > deadHour || (currentHour === deadHour && currentMinute >= deadMin))
  ```
* **Impact & QA Risk:**
  For overnight cutoffs (e.g., `02:00 AM` cutoff for next day's lunch), comparing `currentHour` at 11:00 PM (`currentHour = 23`) yields `23 > 2 = true`. Members are locked out 3 hours before the actual deadline.
* **Remediation:**
  Convert deadline strings into absolute timestamp objects comparing against current UTC epoch time.

---

## 🧪 4. TEST AUTOMATION & QA COVERAGE DEFICITS

### ⚪ 4.1 Missing Integration & Concurrency Test Suites
* **Severity:** **HIGH**
* **Target Directory:** [`backend/test/`](file:///d:/app_dev/hollaru%20manager/backend/test)
* **Gaps Identified:**
  1. **Concurrency Stress Tests:** No test suites simulate concurrent meal modifications (e.g., 50 members toggling OFF status at the exact same second).
  2. **End-to-End Boundary Coverage:** Absence of automated tests for lock-timer cutoffs, failover switches, or month-closure financial balances.

---

## 🛠️ Summary Action Plan

1. **Immediate (Blocker):** Refactor `DailyLog.id` generation to prevent multi-mess data corruption.
2. **Immediate (Critical):** Standardize timezone parsing using `Asia/Dhaka` across all daily log queries.
3. **High Priority:** Await `updateRefreshToken` DB call in `auth.service.ts` and set CAPTCHA to fail-closed.
4. **Medium Priority:** Add missing `@Roles(Role.MANAGER)` controller decorators and rewrite deadline comparison logic.
