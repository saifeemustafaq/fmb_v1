# FMB v1 — Project TODO & Progress Tracker

**Last Updated:** February 8, 2026  
**Current Phase:** Weeks Menus + Cart Building (Phase 1A done; 1B in progress)  
**Status:** On track

---

## 📊 Quick Stats

| Phase | Status | Progress |
|-------|--------|----------|
| **Phase 0: Foundations** | 🟢 DONE | 100% |
| **Phase 1A: Week Plans + Cook Cart Building** | 🟢 DONE | 100% |
| **Phase 1B: Admin Cart Review** | 🟡 IN PROGRESS | 40% |
| **Phase 2: Nice-to-Have** | ⚪ NOT STARTED | 0% |
| **Phase 3: Inventory (Optional)** | ⚪ NOT STARTED | 0% |

---

## 🟢 Phase 0 — Foundations (100% DONE)

### Auth + Roles
- [x] Admin login page ([app/login/page.tsx](app/login/page.tsx))
- [x] Cook login page ([app/login/page.tsx](app/login/page.tsx))
- [x] JWT token generation & validation ([lib/auth.ts](lib/auth.ts))
- [x] Role-based middleware ([middleware.ts](middleware.ts))
  - [x] Admin access control
  - [x] Cook access control
  - [x] Volunteer access control
- [x] Login API route ([app/api/auth/login/route.ts](app/api/auth/login/route.ts))
- [x] Logout API route ([app/api/auth/logout/route.ts](app/api/auth/logout/route.ts))
- [x] Me API route ([app/api/auth/me/route.ts](app/api/auth/me/route.ts))
- [x] Admin seed script ([scripts/seed-admin.mjs](scripts/seed-admin.mjs))
- [x] Password hashing with bcryptjs ([lib/auth.ts](lib/auth.ts))

### Ingredients Seeding & APIs ✅ JUST COMPLETED
- [x] Ingredient TypeScript interface ([lib/interfaces/ingredient.ts](lib/interfaces/ingredient.ts))
- [x] Store seed script ([scripts/seed-stores.mjs](scripts/seed-stores.mjs)) — 5 default stores
- [x] Ingredient seed script ([scripts/seed-ingredients.mjs](scripts/seed-ingredients.mjs)) — 1,700+ products → ingredients
- [x] MongoDB ingredient helpers ([lib/ingredients.ts](lib/ingredients.ts))
  - [x] `getIngredientsByVisibility(userId)` — global + private
  - [x] `searchIngredients(query, userId)` — case-insensitive search
  - [x] `getIngredientsByCategory(userId)` — grouped by category
  - [x] `getIngredientById(id)` — fetch single
  - [x] `addPrivateIngredient(ing, userId)` — cook creates pending
  - [x] `getPendingIngredients()` — admin view pending
  - [x] `approvePrivateIngredient(id)` — admin approves → global
- [x] Mobile-first IngredientPicker component ([components/ui/ingredient-picker.tsx](components/ui/ingredient-picker.tsx))
  - [x] Search with category tabs
  - [x] Pending badge for private ingredients
  - [x] "Add Missing Ingredient" button
  - [x] Large touch targets (48px+ buttons)
  - [x] Scrollable list for mobile

### Infrastructure
- [x] MongoDB connection pooling ([lib/mongodb.ts](lib/mongodb.ts))
- [x] TypeScript config ([tsconfig.json](tsconfig.json))
- [x] Environment setup (.env.local)
- [x] UI component library (shadcn/ui via Radix + Tailwind)
- [x] ESLint config ([eslint.config.mjs](eslint.config.mjs))

### Remaining Phase 0 Tasks
- [X] Admin dashboard stub ([app/admin/page.tsx](app/admin/page.tsx))
- [X] Cook dashboard stub ([app/cook/page.tsx](app/cook/page.tsx))
- [X] Volunteer dashboard stub ([app/volunteer/page.tsx](app/volunteer/page.tsx))
- [X] Verify all seed scripts run successfully
  - [x] `npm run seed:admin` → creates test admin
  - [x] `npm run seed:stores` → creates 5 stores
  - [x] `npm run seed:ingredients` → creates 1,700+ ingredients

---

## 🟢 Phase 1A — Week Plans + Cook Cart Building (100% DONE)

### Data Models
- [x] Create `week_plans` schema with day types and per-day cook ([lib/interfaces/cart.ts](lib/interfaces/cart.ts))
  ```js
  {
    _id, weekStartDate, createdByAdminId, assignedCookId,
    days: [{ date, dayType: "no_thali"|"thali"|"jamaat_wide_thali"|"miqaat", isClosed?, headcount, menuItems, assignedCookId? }],
    notes, createdAt
  }
  ```
- [x] Create `carts` schema — one cart per (weekPlanId, cookId)
- [x] Create `cart_items` schema with snapshots
- [x] TypeScript interfaces: `WeekPlanRecord`, `WeekPlanDay`, `DayType`, `CartRecord`, `CartItemRecord`

### MongoDB Helpers
- [x] Cart helpers ([lib/carts.ts](lib/carts.ts)): getCartById, createCart, addItemToCart, removeItemFromCart, updateCartItemQuantity, submitCart, getCookCarts, getCartByWeekAndCook, getCartsByWeekPlan, getCombinedCartForWeekPlan

- [x] Week Plan helpers ([lib/week-plans.ts](lib/week-plans.ts)): getWeekPlanById, getCookAssignedWeekPlan (per-day cook), getEffectiveCookIdForDay, getDaysForCook, createWeekPlan, updateWeekPlan, listAllWeekPlans, serializeWeekPlanForResponse
### API Routes
- [x] `POST /api/carts` — create new cart
- [x] `GET /api/carts?weekPlanId=xxx` — get current user's cart for that week plan
- [x] `GET /api/carts/:cartId` — fetch cart with items
- [x] `POST /api/carts/:cartId/items` — add item to cart
- [x] `PATCH /api/carts/:cartId/items/:itemId` — update item quantity
- [x] `DELETE /api/carts/:cartId/items/:itemId` — remove item
- [x] `PATCH /api/carts/:cartId/submit` — submit cart to admin
- [x] `GET /api/week-plans` — list all week plans (admin)
- [x] `POST /api/week-plans` — admin create week plan (full or single-day)
- [x] `GET /api/week-plans/:weekPlanId` — get week details (admin or assigned cook)
- [x] `PATCH /api/week-plans/:weekPlanId` — admin edit week plan
- [x] `GET /api/week-plans/cook/:cookId` — get assigned plan for cook (per-day assignment)
- [x] `GET /api/week-plans/:weekPlanId/carts` — list carts for that week (admin)
- [x] `GET /api/week-plans/:weekPlanId/combined-cart` — merged cart for week (admin)

### Admin UI — Week Plans
- [x] Week plans list ([app/admin/week-plans/page.tsx](app/admin/week-plans/page.tsx)) — list all plans, Create Week Plan / Create Single-Day Plan
- [x] Create week plan ([app/admin/week-plans/new/page.tsx](app/admin/week-plans/new/page.tsx)) — full week or single-day, day types, per-day cook override
- [x] Week plan detail ([app/admin/week-plans/[id]/page.tsx](app/admin/week-plans/[id]/page.tsx)) — days, carts list, View combined cart, link to combined PDF
- [x] Combined cart PDF page ([app/admin/week-plans/[id]/combined-pdf/page.tsx](app/admin/week-plans/[id]/combined-pdf/page.tsx)) — print-friendly combined list, Print / Save as PDF

### Cook UI
- [x] Cook dashboard ([app/cook/page.tsx](app/cook/page.tsx)) — assigned plan, **your days only**, **day types** (No thali, Thali, Jamaat wide thali, Miqaat), Build Cart / Continue Building Cart
- [x] Cart builder ([app/cook/cart/new/page.tsx](app/cook/cart/new/page.tsx)) — IngredientPicker, quantity +/- , cart items list, "Your days" context, Add missing ingredient, Submit cart
- [x] Add missing ingredient form ([components/ui/add-missing-ingredient-form.tsx](components/ui/add-missing-ingredient-form.tsx))
- [x] Cart items list component ([components/ui/cart-items-list.tsx](components/ui/cart-items-list.tsx))

### Mobile-First
- [x] Buttons 48px+ height, large font, vertical layout in week plan and cart flows
- [ ] Test on actual mobile device (iOS/Android)

---

## 🟡 Phase 1B — Admin Cart Review (IN PROGRESS)

### Data Models
- [ ] Add to `carts`: `quantityApproved`, `notes` fields
- [ ] Add to `cart_items`: `quantityToBuy` field (computed by admin) — field exists, admin UI to set it not yet built

### MongoDB Helpers
- [x] `getCartsByWeekPlan(weekPlanId)` — all carts for a week ([lib/carts.ts](lib/carts.ts))
- [x] `getCombinedCartForWeekPlan(weekPlanId)` — merged cart for week ([lib/carts.ts](lib/carts.ts))
- [ ] `getAllSubmittedCarts()` — admin queue of carts to review
- [ ] `updateCartItemApprovedQuantity(cartItemId, qty)`
- [ ] `markItemAsInStock(cartItemId)` — don't need to buy
- [ ] `finalizeCart(cartId)` — lock cart, generate shopping list

### API Routes
- [ ] `GET /api/admin/carts` — list all submitted carts
- [ ] `GET /api/admin/carts/:cartId` — view cart with all items for review
- [ ] `PATCH /api/admin/carts/:cartId/items/:itemId` — approve quantity
- [ ] `PATCH /api/admin/carts/:cartId/finalize` — finalize cart & generate list

### UI Components
- [ ] Admin cart review page ([app/admin/carts/page.tsx](app/admin/carts/page.tsx))
  - [ ] List all submitted carts (by week)
  - [ ] Show cook name, week dates, item count
  - [ ] Link to review each cart

- [ ] Cart review detail page ([app/admin/carts/[cartId]/page.tsx](app/admin/carts/%5BcartId%5D/page.tsx))
  - [ ] Show all items grouped by category
  - [ ] Each item shows: name, quantity requested, unit, category, store
  - [ ] Input to adjust approved quantity
  - [ ] Checkbox to mark "in stock" (exclude from shopping list)
  - [ ] "Finalize Cart" button
  - [ ] "Generate Shopping List" button

### PDF Generation
- [x] Combined cart HTML/print template ([lib/pdf-generator.ts](lib/pdf-generator.ts)) — `generateCombinedCartHtml`, grouped by category
- [x] Combined cart print page ([app/admin/week-plans/[id]/combined-pdf/page.tsx](app/admin/week-plans/[id]/combined-pdf/page.tsx)) — Print / Save as PDF for merged week cart
- [ ] Single-cart PDF API route (`GET /api/admin/carts/:cartId/pdf`) — optional for per-cook list
- [ ] Download button in cart review UI (when admin cart review pages exist)

---

## ⚪ Phase 2 — Nice-to-Have (AFTER MVP)

### Private Ingredient Approval
- [ ] Admin pending ingredients page ([app/admin/pending-ingredients/page.tsx](app/admin/pending-ingredients/page.tsx))
  - [ ] List all pending private ingredients
  - [ ] Show: name, category, unit, cook who added
  - [ ] Edit form to adjust before approving
  - [ ] Approve button → converts to global
  - [ ] Reject button (optional)

- [ ] `GET /api/admin/pending-ingredients` — list pending
- [ ] `PATCH /api/admin/pending-ingredients/:id/approve` — approve with optional edits
- [ ] `DELETE /api/admin/pending-ingredients/:id` — reject

### Recipe Creation (Optional)
- [ ] Create `recipes` MongoDB schema
  ```js
  {
    _id, name, serves, ingredients: [{ ingredientId, quantity, unit, notes }],
    createdBy, createdAt
  }
  ```
- [ ] Recipe CRUD API routes
- [ ] Recipe admin page
- [ ] "Use recipe in cart" quick-add button (pre-fill ingredients)

### Enhanced Week Planning
- [ ] Link `week_plans.menuItems` to actual `recipes` (not just strings)
- [ ] Suggest ingredients from recipes when building cart
- [ ] Show full recipe details in week plan view

---

## ⚪ Phase 3 — Inventory Management (OPTIONAL / FUTURE)

### Inventory Tracking
- [ ] Add to `ingredients`: `stockOnHand`, `reorderThreshold` fields
- [ ] Create `inventory_logs` collection for audit trail
- [ ] Admin page to update stock levels

### Smart Recommendations
- [ ] Compute `quantityToBuy = max(requested - stock, 0)` in cart review
- [ ] Auto-flag low-stock items
- [ ] Suggest quantities based on stock

### API Routes
- [ ] `PATCH /api/admin/ingredients/:id/stock` — update stock
- [ ] `GET /api/admin/inventory/low-stock` — items below threshold

---

## 🔄 Cross-Cutting Concerns

### Error Handling
- [ ] Standardized API error responses
- [ ] User-friendly error messages (no MongoDB dumps)
- [ ] Proper HTTP status codes (400, 404, 500, etc.)

### Validation & Security
- [ ] Input validation (Zod schemas)
- [ ] Role-based authorization on all API routes
- [ ] Prevent cooks from accessing other cooks' carts
- [ ] Prevent unauthorized ingredient edits

### Testing
- [ ] Unit tests for helpers
- [ ] Integration tests for API routes
- [ ] Manual mobile testing on iOS/Android

### Documentation
- [x] [COOK_API_REFERENCE.md](COOK_API_REFERENCE.md) — ingredient APIs
- [ ] [CART_API_REFERENCE.md](CART_API_REFERENCE.md) — cart APIs (TODO)
- [ ] [ADMIN_API_REFERENCE.md](ADMIN_API_REFERENCE.md) — admin APIs (TODO)
- [ ] [SETUP.md](SETUP.md) — how to run seeds & dev server (TODO)

### Deployment Readiness
- [ ] Environment variables documented
- [ ] Database indexes optimized
- [ ] Build passes without warnings
- [ ] Error logging setup

---

## 📅 Implementation Order (Recommended)

**Done:**
1. ✅ Phase 0: Foundations + Ingredients
2. ✅ Phase 1A: Week plans (day types, per-day cook, single-day) + cart data models + helpers + APIs
3. ✅ Phase 1A: Admin week-plan UI (list, new, detail, combined cart, combined PDF page)
4. ✅ Phase 1A: Cook dashboard (your days, day types) + cart builder
5. ✅ Combined cart PDF (print page for merged week)

**Next:**
6. Phase 1B: Admin cart review (list submitted carts, review detail, finalize, single-cart PDF if desired)
7. Full end-to-end testing (seed → admin creates plan → cook adds → admin reviews → PDF)
8. Mobile device testing

**Later:**
9. Phase 2 features (pending ingredients approval, recipes)
10. Phase 3 inventory (if needed)
11. Deployment prep

---

## 📝 Notes & Decisions

- **Silent fields:** `stockOnHand`, `reorderThreshold`, `quantityToBuy` are nullable and ignored in MVP. They're ready for Phase 3 without schema migration.

- **Visibility system:** Private pending ingredients are automatic when cooks add missing items. No extra complexity.

- **Cart snapshots:** `cart_items` stores snapshots of ingredient name/category/store at time of adding. Safe if ingredient gets renamed.

- **No Mongoose:** Using direct MongoDB driver for simplicity and performance.

- **Seed scripts:** Must run in order: `seed:admin` → `seed:stores` → `seed:ingredients`

- **Mobile-first philosophy:** Assumed design for 65+ users. Big buttons, minimal typing, high readability.

---

## 🎯 Success Criteria for MVP

- [x] Ingredients seeded and searchable
- [x] Cook can view assigned week plan (your days only, day types)
- [x] Cook can create cart and add ingredients
- [x] Cook can add missing ingredients (pending approval)
- [x] Cook can submit cart
- [x] Admin can create week plans (full week + single-day, day types, per-day cook)
- [x] Admin can view week plan detail and carts per week
- [x] Admin can view combined cart and Print / Save as PDF for week
- [ ] Admin can review individual submitted carts (Phase 1B)
- [ ] Admin can adjust quantities and mark items "in stock" (Phase 1B)
- [x] Combined PDF is downloadable (print page for merged week cart)
- [x] All APIs have proper auth
- [ ] Mobile testing complete
- [x] No TypeScript/ESLint errors

---

**Last Sprint:** Feb 8, 2026 — Weeks Menus phase implemented (day types, per-day cook, single-day plans, combined cart, admin week-plan UI, cook your-days + day types, combined PDF)  
**Next Sprint:** Phase 1B — Admin cart review (list submitted carts, review detail, finalize, single-cart PDF if desired)  
**Contact:** Refer to idea.md for business requirements
