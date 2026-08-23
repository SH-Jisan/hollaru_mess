# 🧪 Meal Book Backend - Master Sequential Testing Manual

This document provides a **100% verified, real-world sequential testing manual** for the **Meal Book Backend**. Follow this exact serial flow to test all features, business logic, success scenarios, error handling, and authorization guards.

---

## 📋 Logical Testing Sequence
1. **Phase 1**: Manager Registration & Login
2. **Phase 2**: Mess Creation (Creator automatically becomes MANAGER)
3. **Phase 3**: Monthly Billing Session Initialization (Manager Only)
4. **Phase 4**: Member Registration & Mess Join (Member Flow)
5. **Phase 5**: Daily Meal Operations (Live Count, OFF/Guest Request & Manager Approval)
6. **Phase 6**: Bazaar Expense & Member Deposit Management
7. **Phase 7**: Monthly Calculation, Meal Rate & Balance Sheet Summary
8. **Phase 8**: Month Closure Archiving & Notifications

---

## 🚀 Phase 1: Manager Registration & Auth Setup

### Step 1.1: Register Manager User
* **URL**: `POST http://localhost:3000/auth/register`
* **Request Body**:
```json
{
  "name": "Jisan Manager",
  "email": "manager@test.com",
  "password": "password123",
  "phone": "01711000000"
}
```
* **Success Scenario (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id_manager",
      "name": "Jisan Manager",
      "email": "manager@test.com",
      "role": "MEMBER"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```
* **Error Scenario (`409 Conflict` - Duplicate Email)**:
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Email address is already registered"
}
```

---

## 🏠 Phase 2: Mess Creation (Manager Elevation)

### Step 2.1: Create a New Mess
* **Header**: `Authorization: Bearer <manager_access_token>`
* **URL**: `POST http://localhost:3000/mess`
* **Request Body**:
```json
{
  "name": "Dream Heaven Mess"
}
```
* **Success Scenario (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "mess": {
      "id": "mess_id_123",
      "name": "Dream Heaven Mess",
      "code": "MESS-JI4P",
      "managerId": "user_id_manager",
      "isMonthActive": false
    },
    "accessToken": "NEW_MANAGER_ACCESS_TOKEN_HERE",
    "refreshToken": "NEW_REFRESH_TOKEN_HERE"
  }
}
```
> 🔑 **Important**: Copy the newly returned `accessToken` which contains `"role": "MANAGER"`.

* **Error Scenario (`400 Bad Request` - Already in a Mess)**:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "User already belongs to a mess"
}
```

---

## 📅 Phase 3: Monthly Session Setup

### Step 3.1: Start New Billing Month (Manager Only)
* **Header**: `Authorization: Bearer <new_manager_access_token>`
* **URL**: `POST http://localhost:3000/billing/start-month`
* **Request Body**:
```json
{
  "monthName": "August 2026"
}
```
* **Success Scenario (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "month_id_august",
    "monthName": "August 2026",
    "messId": "mess_id_123",
    "isClosed": false
  }
}
```
* **Error Scenario (`403 Forbidden` - Non-Manager Attempt)**:
```json
{
  "success": false,
  "statusCode": 403,
  "message": "You do not have permission to access this resource"
}
```

---

## 👥 Phase 4: Member Registration & Join Flow

### Step 4.1: Register Member User
* **URL**: `POST http://localhost:3000/auth/register`
* **Request Body**:
```json
{
  "name": "Rahim Member",
  "email": "rahim@test.com",
  "password": "password123",
  "phone": "01812345678"
}
```
* **Success Scenario (`201 Created`)**:
Returns `accessToken` for Rahim Member.

### Step 4.2: Join Mess using Invitation Code
* **Header**: `Authorization: Bearer <member_access_token>`
* **URL**: `POST http://localhost:3000/mess/join`
* **Request Body**:
```json
{
  "code": "MESS-JI4P"
}
```
* **Success Scenario (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "message": "Successfully joined the mess",
    "messName": "Dream Heaven Mess",
    "accessToken": "UPDATED_MEMBER_ACCESS_TOKEN"
  }
}
```
* **Error Scenario (`404 Not Found` - Invalid Code)**:
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Invalid or expired mess invite code"
}
```

---

## 🍲 Phase 5: Daily Meals Engine

### Step 5.1: View Today's Live Meal Summary
* **Header**: `Authorization: Bearer <member_access_token>`
* **URL**: `GET http://localhost:3000/meals/live`
* **Success Scenario (`200 OK`)**:
Returns today's active lunch/dinner counts and pending requests list.

### Step 5.2: Member Submits Meal OFF Request
* **Header**: `Authorization: Bearer <member_access_token>`
* **URL**: `POST http://localhost:3000/meals/request`
* **Request Body**:
```json
{
  "type": "LUNCH",
  "category": "OFF",
  "count": 1
}
```
* **Success Scenario (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "meal_req_123",
    "type": "LUNCH",
    "category": "OFF",
    "count": 1,
    "status": "PENDING"
  }
}
```
* **Error Scenario (`400 Bad Request` - Deadline Passed)**:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "LUNCH deadline has passed. Modifications are locked."
}
```

### Step 5.3: Manager Approves Meal Modification Request
* **Header**: `Authorization: Bearer <manager_access_token>`
* **URL**: `PATCH http://localhost:3000/meals/approve/<meal_req_123>`
* **Success Scenario (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "message": "Request approved successfully"
  }
}
```

---

## 🛒 Phase 6: Bazaar & Deposit Operations

### Step 6.1: Add Item to Bazaar Shopping List
* **Header**: `Authorization: Bearer <member_access_token>`
* **URL**: `POST http://localhost:3000/bazaar/item`
* **Request Body**:
```json
{
  "items": "Rice 25kg, Fish 4kg, Vegetables"
}
```
* **Success Scenario (`201 Created`)**: Item added with status `PENDING`.

### Step 6.2: Complete Bazaar Purchase with Receipt Cost
* **Header**: `Authorization: Bearer <member_access_token>`
* **URL**: `PATCH http://localhost:3000/bazaar/complete/<bazaar_item_id>`
* **Request Body**:
```json
{
  "cost": 1850.00
}
```
* **Success Scenario (`200 OK`)**: Item marked as `COMPLETED` and added to monthly total cost.

### Step 6.3: Manager Logs Member Balance Deposit
* **Header**: `Authorization: Bearer <manager_access_token>`
* **URL**: `POST http://localhost:3000/bazaar/deposit`
* **Request Body**:
```json
{
  "userId": "<rahim_member_user_id>",
  "amount": 2000
}
```
* **Success Scenario (`201 Created`)**: Deposit recorded under active month.

---

## 📊 Phase 7: Billing Summary & Meal Rate

### Step 7.1: View Monthly Meal Rate & Balance Sheet
* **Header**: `Authorization: Bearer <member_access_token>`
* **URL**: `GET http://localhost:3000/billing/summary`
* **Success Scenario (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "monthId": "month_id_august",
    "totalBazaarCost": 1850.00,
    "totalMeals": 42,
    "mealRate": 44.05,
    "members": [
      {
        "memberId": "user_id_rahim",
        "name": "Rahim Member",
        "totalMeals": 20,
        "totalDeposit": 2000,
        "mealCost": 881.00,
        "balance": 1119.00
      }
    ]
  }
}
```

---

## 🔒 Phase 8: Month Closure & Archiving

### Step 8.1: Close Month Session (Manager Only)
* **Header**: `Authorization: Bearer <manager_access_token>`
* **URL**: `POST http://localhost:3000/billing/close-month`
* **Success Scenario (`200 OK`)**: Month archived (`isClosed: true`).
