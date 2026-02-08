import { ObjectId } from "mongodb";

/** Day type: determines if service and what kind */
export type DayType =
  | "no_thali"
  | "thali"
  | "jamaat_wide_thali"
  | "miqaat";

/**
 * Week Plan Record
 * Represents a weekly menu plan created by admin; cooks assigned at week or per-day level
 */
export type WeekPlanRecord = {
  _id?: ObjectId;
  weekStartDate: Date; // ISO date (Monday, or single-day plan date)
  createdByAdminId: ObjectId;
  assignedCookId: ObjectId; // default cook for days without per-day override
  days: WeekPlanDay[];
  notes?: string;
  createdAt: Date;
};

export type WeekPlanDay = {
  date: Date; // ISO date
  /** Day type: no_thali = no service; others need headcount + menuItems */
  dayType: DayType;
  /** Legacy: true when dayType === "no_thali" (for backward compat) */
  isClosed?: boolean;
  headcount: number; // e.g. 120 (relevant when dayType !== "no_thali")
  menuItems: string[]; // e.g. ["Poha", "Dal", "Rice"]
  /** Override cook for this day; if missing, use week-level assignedCookId */
  assignedCookId?: ObjectId;
};

/**
 * Cart Record
 * One cart per week per cook
 */
export type CartRecord = {
  _id?: ObjectId;
  weekPlanId: ObjectId;
  cookId: ObjectId;
  status: "draft" | "submitted" | "finalized";
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Cart Item Record
 * Individual ingredients in a cart with snapshots for safety
 */
export type CartItemRecord = {
  _id?: ObjectId;
  cartId: ObjectId;
  ingredientId: ObjectId; // points to ingredients collection

  // Snapshots (safe if ingredient renamed/deleted)
  nameSnapshot: string;
  categorySnapshot: string;
  storeIdSnapshot: ObjectId | null;

  quantityRequested: number;
  unit: string;

  // Silent fields for Phase 3 (nullable, ignored in MVP)
  stockOnHandSnapshot?: number | null;
  quantityToBuy?: number | null; // admin computed later

  addedByUserId: ObjectId;
  createdAt: Date;
};
