# Meal Book - CacheModule Architecture & Implementation Plan

This document outlines the professional plan, strategy, naming conventions, and implementation steps for integrating **In-Memory Caching** into the **Meal Book** NestJS backend.

---

## 🛠️ 1. Technologies & Packages

| Package | Version / Type | Role in Project |
| :--- | :--- | :--- |
| **`@nestjs/cache-manager`** | NestJS Official Module | Provides unified caching decorators, interceptors, and module configuration. |
| **`cache-manager`** | Core Caching Engine | Provides the underlying cache store interfaces (`get`, `set`, `del`, `reset`). |
| **In-Memory Store (RAM)** | Local Process Memory | Default zero-latency, high-speed RAM storage with LRU eviction and TTL support. |

---

## 🏗️ 2. Caching Strategy & Architecture Pattern

We will use the **Cache-Aside Pattern (Read-Through + Event-Driven Invalidation)**:

1. **Read Request (Cache-Aside)**:
   * The Service checks if the requested key exists in the Cache memory (`cache.get(key)`).
   * **Cache Hit**: Data is returned instantly from RAM (<2ms latency) without hitting PostgreSQL.
   * **Cache Miss**: Data is queried from PostgreSQL (Supabase), saved to RAM with a specific TTL (`cache.set(key, data, ttl)`), and returned to the client.

2. **Write/Update Request (Event-Driven Invalidation)**:
   * When data is mutated (e.g., meal request approved, bazaar item added, deposit logged), the Service invalidates (deletes) the relevant cache key (`cache.del(key)`).
   * The next read request automatically fetches fresh, updated data from PostgreSQL and repopulates the cache.

---

## 🔑 3. Naming Conventions & Key Structure

To avoid key collisions between different messes and endpoints, all cache keys must follow strict hierarchical namespacing:

| Resource | Cache Key Format | Example Key |
| :--- | :--- | :--- |
| **Daily Live Meal Count** | `meals:{messId}:{YYYY-MM-DD}:live` | `meals:mess-uuid-123:2026-07-21:live` |
| **Bazaar Grocery List** | `bazaar:{messId}:{monthId}:list` | `bazaar:mess-uuid-123:month-uuid-456:list` |
| **Mess Member List** | `mess:{messId}:members` | `mess:mess-uuid-123:members` |
| **Monthly Billing Summary** | `billing:{messId}:{monthId}:summary` | `billing:mess-uuid-123:month-uuid-456:summary` |

---

## ⏱️ 4. Dynamic TTL (Time-To-Live) & Invalidation Matrix

| Endpoint / API | Default TTL | Invalidation Trigger Events |
| :--- | :--- | :--- |
| **Live Meal Count** (`GET /meals/live`) | **5 Minutes (300s)** | • Manager approves a meal request (`PATCH /meals/approve/:id`)<br>• Member submits new meal request |
| **Bazaar List** (`GET /bazaar/list`) | **15 Minutes (900s)** | • Item added (`POST /bazaar/item`)<br>• Purchase completed (`PATCH /bazaar/complete/:id`) |
| **Mess Members** (`GET /mess/members`) | **30 Minutes (1800s)** | • Member joins mess (`POST /mess/join`) |
| **Billing Summary** (`GET /billing/summary`) | **10 Minutes (600s)** | • Deposit logged (`POST /bazaar/deposit`)<br>• Month session closed/archived |

---

## 🛡️ 5. Memory Safety & Protection Rules

To ensure memory safety and prevent RAM overflow on low-tier hosting environments:

1. **Max Memory Items Limit**: `max: 500` (Limits maximum total cached items in memory).
2. **Eviction Policy**: **LRU (Least Recently Used)** automatically clears the oldest unaccessed cache entry when max capacity is reached.
3. **Data Sanitization**: Sensitive authentication payload data (password hashes, refresh tokens) will **never** be cached.

---

## 🗺️ 6. Implementation Roadmap

Follow these 4 steps to complete the CacheModule integration:

* **Step 1: Global CacheModule Configuration**: Register `CacheModule.forRoot()` in `app.module.ts` with global configuration (`isGlobal: true`, `ttl: 300`, `max: 500`).
* **Step 2: Helper Cache Service / Provider**: Inject `CACHE_MANAGER` into services requiring caching.
* **Step 3: Service Layer Integration**: Update `MealsService`, `BazaarService`, `MessService`, and `BillingService` to add cache lookup and invalidation.
* **Step 4: Verification & Testing**: Verify cache hit responses and invalidation behavior via Swagger API tests.
