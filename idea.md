## Goal (what we’re building)

A **mobile-first, ultra-simple kitchen ops app** where:

* **Admin/Team** plans the **weekly menu** (some days closed) + **headcount**.
* A **Cook** receives the plan, builds an **ingredient cart** for the week.
* Each ingredient is tied to a **store/location**.
* **Admin** reviews the cart vs **on-hand inventory** and produces a **final shopping list** grouped by category.
* Admin **downloads a PDF** shopping list for a volunteer.
* Cooks can add missing ingredients as **“private suggestions”** (visible only to them) until Admin approves them into the global list.

Key constraints:

* **MongoDB backend**
* **Strictly mobile-first**
* **Very low complexity / no overengineering**
* **Designed for 65+ users (big UI, few steps, minimal typing)**

---

## Updated workflow (simplified, fewer moving parts)

### 1) Weekly planning (Admin)

* Create a **Week Plan** (full week or single-day ad-hoc plan)

  * days: Mon–Sun (or one day for ad-hoc, e.g. “Miqaat day after tomorrow”)
  * for each day: **day type** (`no_thali` | `thali` | `jamaat_wide_thali` | `miqaat`), `menu items`, `headcount`
  * assign a **Cook** at week level (default) and/or **per day** (e.g. different cook for Miqaat day)
* Single-day plan: one date, one day type, one cook → same flow as week plan; cook builds one cart.
* Multiple cooks in one week: each cook has their own cart for their assigned days; admin sees a **combined cart** (merged items) for the week and can generate one PDF.

### 2) Cart building (Cook)

* Cook opens the dashboard and sees **assigned plan(s)** — only **their days** (e.g. Mon–Sat or single Miqaat day), with **day type** (No thali, Thali, Jamaat wide thali, Miqaat), headcount, menu.
* Cook taps **“Build Cart”** (or “Continue” if a cart already exists). One cart per (week plan, cook).
* Cook adds ingredients (from list) with **quantity + unit**. Cart builder shows context “Your days: …”.
* If ingredient not found: **“Add missing ingredient”**

  * cook only enters: `name`, selects `unit`, enters `quantity`
  * the ingredient becomes a **private ingredient** (cook-scoped) and is added to cart.

### 3) Admin review → Final shopping list

* Admin opens the week cart, sees all items grouped by category/store.
* Admin compares with inventory (initially manual; later assisted):

  * adjusts quantities
  * marks items as “already in stock” or reduces quantity
* Admin clicks **“Generate Shopping List”**

  * grouped by **category** (fresh / spices / dry etc)
  * optionally also show **store grouping** inside category

### 4) Export PDF

* One tap: **Download PDF**.

### 5) Admin approval of private ingredients (periodic)

* Admin opens “Pending Ingredients”
* Approves/edits category/store/unit → becomes **global** (visible to all cooks)

---

## Data model (MongoDB collections)

Keep it small. These 7 are enough for MVP.

### 1) `users`

```js
{
  _id,
  name,
  its,                    // ITS number (unique identifier for authentication)
  passwordHash,           // bcrypt hashed password (NEVER store plain text)
  phoneOrEmail,
  role: "admin" | "cook" | "volunteer",
  isActive: true,
  createdAt,
  updatedAt
}
```

**Authentication:**
- ITS number is used as the username/identifier
- Password is hashed with bcrypt (cost factor 10-12) before storing
- During login: compare submitted password against stored hash using `bcrypt.compare()`

### 2) `stores`

```js
{
  _id,
  name,
  address,
  notes,
  isActive: true,
  createdAt
}
```

### 3) `ingredients`

This is your master list + private cook additions.

```js
{
  _id,
  name,
  category,               // e.g. "Spices (whole)"
  defaultUnit,            // e.g. "kg", "g", "pcs"
  storeId,                // default store (optional but useful)
  notes: "",

  visibility: "global" | "private",
  ownerUserId: null | userId,     // null for global; cookId for private
  status: "active" | "pending",   // pending = awaiting admin review

  // silent inventory helpers (for later)
  stockOnHand: null,       // number (optional; later)
  reorderThreshold: null,  // number (optional; later)

  createdBy,
  createdAt
}
```

**Rule:**

* Cooks can only see: `visibility=global` OR `ownerUserId = self`
* Admin sees all, including pending private items.

### 4) `week_plans`

```js
{
  _id,
  weekStartDate,          // ISO date (Monday, or single-day plan date)
  createdByAdminId,
  assignedCookId,         // default cook for days without per-day override
  days: [
    {
      date,               // ISO date
      dayType: "no_thali" | "thali" | "jamaat_wide_thali" | "miqaat",
      isClosed,           // legacy: true when dayType === "no_thali"
      headcount: 120,
      menuItems: ["Poha", "Dal", "Rice"],  // just names for MVP
      assignedCookId      // optional; override cook for this day
    }
  ],
  notes,
  createdAt
}
```

* **Day types:** `no_thali` = no service; `thali`, `jamaat_wide_thali`, `miqaat` = service day with headcount + menuItems.
* **Single-day plan:** same collection; `days.length === 1`.
* **Per-day cook:** if `assignedCookId` on a day is set, that cook is responsible for that day; otherwise the week-level `assignedCookId` applies. One cart per (weekPlanId, cookId); combined cart for the week merges all carts by ingredient (sum quantities) for admin/PDF.
* Keep “menuItems” as strings for now. You can later map to `recipes`.

### 5) `carts`

One cart per week per cook.

```js
{
  _id,
  weekPlanId,
  cookId,
  status: "draft" | "submitted" | "finalized",
  createdAt,
  updatedAt
}
```

### 6) `cart_items`

Separate collection keeps cart updates simpler.

```js
{
  _id,
  cartId,
  ingredientId,         // points to ingredients (global or private)
  nameSnapshot,         // store name at time of adding (safe if ingredient renamed)
  categorySnapshot,
  storeIdSnapshot,

  quantityRequested,
  unit,

  // silent future fields:
  stockOnHandSnapshot: null,
  quantityToBuy: null,   // admin computed (later)

  addedByUserId,
  createdAt
}
```

### 7) `recipes` (empty now, but schema ready)

```js
{
  _id,
  name,                  // "Dal Tadka"
  serves,                // 50
  ingredients: [
    { ingredientItemId, quantity, unit, notes: "" }
  ],
  createdBy,
  createdAt
}
```

---

## What to implement first (MVP order)

### Phase 0 — Foundations (fast)

1. **Auth + Roles**

* Admin + Cook login
* Role-based screens

2. **Seed 191 ingredients**

* Upload script or admin “import” once

### Phase 1 — Core value (minimum usable flow)

3. **Week Plan creation (Admin)**

* Create week
* set closed/open days
* headcount per day
* menu item names

4. **Cart building (Cook)**

* View assigned week plan
* Create/edit cart
* Add ingredient from searchable list
* Add missing ingredient (private + pending)
* Cart list view (big text, + / - qty)

5. **Admin cart review**

* View cart grouped by category
* Edit quantities
* Toggle “need to buy” vs “in stock” (even if manual)

6. **Generate PDF**

* PDF contains grouped shopping list + week dates + cook name + totals

✅ At this point you have a complete operational loop without recipes or automation.

### Phase 2 — Nice-to-have, still simple

7. **Pending ingredients approval**

* Approve → convert private pending to global active (or clone as global)

8. **Recipe creation**

* Basic CRUD
* Optional “Add recipe ingredients to cart” later

### Phase 3 — Inventory (only if needed)

9. Track stock and compute “quantityToBuy = max(requested - stock, 0)”

* Still optional and can stay “silent fields” until you’re ready.

---

## Stack (simple, mobile-first, MongoDB-friendly)

To avoid overengineering, I’d do **one codebase**:

### Recommended

**Next.js (App Router) + MongoDB + Tailwind**

* **Frontend:** Next.js + React + TailwindCSS
* **UI components:** shadcn/ui (big buttons, clean forms) or just simple Tailwind
* **Backend:** Next.js Route Handlers (API routes)
* **DB:** MongoDB Atlas + Mongoose (or MongoDB Node driver)
* **Auth:** NextAuth (simple credentials/OTP later)
* **PDF:** server-side generation

  * simplest: generate HTML → PDF using a headless browser (Playwright/Puppeteer)
  * or use a PDF library if you prefer (but HTML→PDF is easiest to style)

### Why this fits your constraints

* Mobile-first responsive web app (works on any phone)
* No app-store deployment
* Single repo, no separate backend service needed
* PDF generation is straightforward on the server

### Optional (only if you truly need “app feel”)

* Make it a **PWA** (add-to-home-screen, fullscreen, offline-lite later)

---

## UI principles for 65+ users (practical rules)

* **One primary action per screen**
* **Big buttons** (min 48px height), large font (16–20+)
* **No dense tables**: use stacked cards
* **Search + quick add** on ingredient picker
* **Avoid typing**:

  * ingredient selection via list
  * quantities via + / - and a numeric keypad input
* **Always show context**:

  * Week range at top
  * Day name + headcount visible when adding items

---

## The “silent inventory field” you mentioned (how to do it safely)

Don’t force inventory logic into MVP. Add fields now so you don’t migrate later:

* On `ingredient_items`: `stockOnHand`, `reorderThreshold` (nullable)
* On `cart_items`: `quantityToBuy` (nullable)

MVP behavior:

* Ignore these fields
* Admin manually edits quantities and the “need to buy” list

Later:

* Admin updates stock
* App suggests quantityToBuy automatically

---

## Summary: the first thing you should implement

**Implement the smallest loop that produces a PDF shopping list:**

1. Admin creates **Week Plan**
2. Cook creates **Cart** (global + private pending ingredients)
3. Admin reviews → **Generate Shopping List**
4. Download **PDF**

If you want, I can also draft:

* exact API routes (Next.js) for each step,
* a minimal Mongo/Mongoose schema set,
* and the PDF template layout (very readable for volunteers).
