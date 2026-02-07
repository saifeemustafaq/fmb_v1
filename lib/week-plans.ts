import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { WeekPlanRecord } from "./interfaces/cart";

/**
 * Get week_plans collection
 */
export function getWeekPlansCollection() {
  const db = getDb();
  return db.collection<WeekPlanRecord>("week_plans");
}

/**
 * Get week plan by ID
 */
export async function getWeekPlanById(
  weekPlanId: ObjectId
): Promise<WeekPlanRecord | null> {
  const weekPlans = getWeekPlansCollection();
  return weekPlans.findOne({ _id: weekPlanId });
}

/**
 * Get cook's assigned week plan (current active week)
 */
export async function getCookAssignedWeekPlan(
  cookId: ObjectId
): Promise<WeekPlanRecord | null> {
  const weekPlans = getWeekPlansCollection();

  // Find the most recent week plan assigned to this cook
  // In MVP, we assume one active week at a time
  return weekPlans.findOne(
    { assignedCookId: cookId },
    { sort: { weekStartDate: -1 } }
  );
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

  const result = await weekPlans.updateOne(
    { _id: weekPlanId },
    { $set: updates }
  );

  return result.modifiedCount > 0;
}

/**
 * List all week plans (admin view)
 */
export async function listAllWeekPlans(): Promise<WeekPlanRecord[]> {
  const weekPlans = getWeekPlansCollection();
  return weekPlans.find().sort({ weekStartDate: -1 }).toArray();
}

/**
 * Get week plans by date range
 */
export async function getWeekPlansByDateRange(
  startDate: Date,
  endDate: Date
): Promise<WeekPlanRecord[]> {
  const weekPlans = getWeekPlansCollection();

  return weekPlans
    .find({
      weekStartDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .sort({ weekStartDate: 1 })
    .toArray();
}
