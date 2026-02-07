import { ObjectId } from "mongodb";

/**
 * Week Plan Record
 * Represents a weekly menu plan created by admin and assigned to a cook
 */
export type WeekPlanRecord = {
  _id?: ObjectId;
  weekStartDate: Date; // ISO date (Monday)
  createdByAdminId: ObjectId;
  assignedCookId: ObjectId; // cook for the week
  days: WeekPlanDay[];
  notes?: string;
  createdAt: Date;
};

export type WeekPlanDay = {
  date: Date; // ISO date
  isClosed: boolean;
  headcount: number; // e.g. 120
  menuItems: string[]; // e.g. ["Poha", "Dal", "Rice"]
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
