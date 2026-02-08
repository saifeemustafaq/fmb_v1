import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { WeekPlanRecord, WeekPlanDay, DayType } from "./interfaces/cart";

/**
 * Get week_plans collection
 */
export function getWeekPlansCollection() {
  const db = getDb();
  return db.collection<WeekPlanRecord>("week_plans");
}

/**
 * Normalize plan when reading (backward compat: add dayType from isClosed if missing)
 */
function normalizePlanForRead(
  plan: WeekPlanRecord | null
): WeekPlanRecord | null {
  if (!plan) return null;
  const days = plan.days.map((day) => ({
    ...day,
    dayType: (day.dayType ?? (day.isClosed ? "no_thali" : "thali")) as DayType,
  }));
  return { ...plan, days };
}

/**
 * Get week plan by ID
 */
export async function getWeekPlanById(
  weekPlanId: ObjectId
): Promise<WeekPlanRecord | null> {
  const weekPlans = getWeekPlansCollection();
  const plan = await weekPlans.findOne({ _id: weekPlanId });
  return normalizePlanForRead(plan);
}

/**
 * Resolve effective cook for a day (per-day override or week default)
 */
export function getEffectiveCookIdForDay(
  day: WeekPlanDay,
  weekDefaultCookId: ObjectId
): ObjectId {
  return day.assignedCookId ?? weekDefaultCookId;
}

/**
 * Get days in a week plan assigned to a specific cook
 */
export function getDaysForCook(
  plan: WeekPlanRecord,
  cookId: ObjectId
): WeekPlanDay[] {
  const defaultCookId = plan.assignedCookId;
  return plan.days.filter(
    (day) =>
      getEffectiveCookIdForDay(day, defaultCookId).equals(cookId)
  );
}

/**
 * Get cook's assigned week plan (current / nearest by date).
 * Cook is assigned if week-level assignedCookId === cookId OR any day's
 * assignedCookId (or default) === cookId.
 */
export async function getCookAssignedWeekPlan(
  cookId: ObjectId
): Promise<WeekPlanRecord | null> {
  const weekPlans = getWeekPlansCollection();

  const plan = await weekPlans.findOne(
    {
      $or: [
        { assignedCookId: cookId },
        { "days.assignedCookId": cookId },
      ],
    },
    { sort: { weekStartDate: -1 } }
  );

  if (!plan) return null;

  // If cook is only assigned via week-level, they're in. If only via some days,
  // we need to ensure at least one day resolves to this cook (in case week-level is different)
  const defaultCookId = plan.assignedCookId;
  const hasAnyDay =
    plan.assignedCookId.equals(cookId) ||
    plan.days.some((day) =>
      getEffectiveCookIdForDay(day, defaultCookId).equals(cookId)
    );
  return hasAnyDay ? normalizePlanForRead(plan) : null;
}

/**
 * Normalize days: set isClosed from dayType for backward compatibility
 */
function normalizeDays(
  days: WeekPlanRecord["days"]
): WeekPlanRecord["days"] {
  return days.map((day) => ({
    ...day,
    isClosed: day.dayType ? day.dayType === "no_thali" : day.isClosed ?? false,
  }));
}

/**
 * Create a new week plan (admin only)
 */
export async function createWeekPlan(
  data: Omit<WeekPlanRecord, "_id" | "createdAt">
): Promise<ObjectId> {
  const weekPlans = getWeekPlansCollection();

  const weekPlan: WeekPlanRecord = {
    ...data,
    days: normalizeDays(data.days),
    createdAt: new Date(),
  };

  const result = await weekPlans.insertOne(weekPlan);
  return result.insertedId;
}

/**
 * Update week plan (admin only)
 */
export async function updateWeekPlan(
  weekPlanId: ObjectId,
  updates: Partial<Omit<WeekPlanRecord, "_id" | "createdAt">>
): Promise<boolean> {
  const weekPlans = getWeekPlansCollection();

  const setUpdates = { ...updates };
  if (setUpdates.days) {
    setUpdates.days = normalizeDays(setUpdates.days);
  }

  const result = await weekPlans.updateOne(
    { _id: weekPlanId },
    { $set: setUpdates }
  );

  return result.modifiedCount > 0;
}

/**
 * List all week plans (admin view)
 */
export async function listAllWeekPlans(): Promise<WeekPlanRecord[]> {
  const weekPlans = getWeekPlansCollection();
  const plans = await weekPlans.find().sort({ weekStartDate: -1 }).toArray();
  return plans.map((p) => normalizePlanForRead(p)!);
}

/**
 * Serialize week plan for JSON response (ObjectIds and Dates to strings)
 */
export function serializeWeekPlanForResponse(plan: WeekPlanRecord) {
  return {
    ...plan,
    _id: plan._id!.toString(),
    weekStartDate:
      plan.weekStartDate instanceof Date
        ? plan.weekStartDate.toISOString().slice(0, 10)
        : plan.weekStartDate,
    createdByAdminId: plan.createdByAdminId.toString(),
    assignedCookId: plan.assignedCookId.toString(),
    days: plan.days.map((d) => ({
      ...d,
      date:
        d.date instanceof Date
          ? d.date.toISOString().slice(0, 10)
          : d.date,
      assignedCookId: d.assignedCookId?.toString() ?? null,
    })),
    createdAt:
      plan.createdAt instanceof Date
        ? plan.createdAt.toISOString()
        : plan.createdAt,
  };
}

/**
 * Get week plans by date range
 */
export async function getWeekPlansByDateRange(
  startDate: Date,
  endDate: Date
): Promise<WeekPlanRecord[]> {
  const weekPlans = getWeekPlansCollection();

  const plans = await weekPlans
    .find({
      weekStartDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .sort({ weekStartDate: 1 })
    .toArray();
  return plans.map((p) => normalizePlanForRead(p)!);
}
