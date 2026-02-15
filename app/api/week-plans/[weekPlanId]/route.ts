import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  countPlansForWeek,
  getWeekPlanById,
  normalizeToMonday,
  updateWeekPlan,
  serializeWeekPlanForResponse,
  getDaysForCook,
} from "@/lib/week-plans";
import type { DayType } from "@/lib/interfaces/cart";

const dayTypeEnum = z.enum([
  "no_thali",
  "thali",
  "jamaat_wide_thali",
  "miqaat",
]);

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  dayType: dayTypeEnum,
  headcount: z.number().int().min(0),
  menuItems: z.array(z.string()),
  assignedCookId: z.string().refine((id) => ObjectId.isValid(id)).optional(),
});

const updateWeekPlanSchema = z.object({
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStartDate must be YYYY-MM-DD")
    .optional(),
  assignedCookId: z
    .string()
    .refine((id) => ObjectId.isValid(id), { message: "Invalid assignedCookId" })
    .optional(),
  name: z.string().optional(),
  days: z
    .array(daySchema)
    .min(1)
    .max(7)
    .refine((days) => days.length === 1 || days.length === 7, {
      message: "Plan must be either single-day (1 day) or full-week (7 days)",
    })
    .optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ weekPlanId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    const { weekPlanId } = await params;

    if (!ObjectId.isValid(weekPlanId)) {
      return NextResponse.json({ error: "Invalid week plan ID" }, { status: 400 });
    }

    const weekPlanObjectId = new ObjectId(weekPlanId);
    const plan = await getWeekPlanById(weekPlanObjectId);

    if (!plan) {
      return NextResponse.json({ error: "Week plan not found" }, { status: 404 });
    }

    // Admin can see any plan; cook can only see if assigned (week or any day)
    if (user.role !== "admin") {
      const cookDays = getDaysForCook(plan, new ObjectId(user.id));
      if (cookDays.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      weekPlan: serializeWeekPlanForResponse(plan),
    });
  } catch (error) {
    console.error("Error fetching week plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ weekPlanId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { weekPlanId } = await params;
    if (!ObjectId.isValid(weekPlanId)) {
      return NextResponse.json({ error: "Invalid week plan ID" }, { status: 400 });
    }

    const plan = await getWeekPlanById(new ObjectId(weekPlanId));
    if (!plan) {
      return NextResponse.json({ error: "Week plan not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateWeekPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    const shouldRevalidateWeekRules =
      parsed.data.weekStartDate != null || parsed.data.days != null;

    if (shouldRevalidateWeekRules) {
      const effectiveDays =
        parsed.data.days ??
        plan.days.map((d) => ({
          date:
            d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date),
          dayType: d.dayType,
          headcount: d.headcount,
          menuItems: d.menuItems,
          assignedCookId: d.assignedCookId?.toString(),
        }));
      const isSingleDay = effectiveDays.length === 1;
      const anchorDate = isSingleDay
        ? new Date(effectiveDays[0].date)
        : parsed.data.weekStartDate != null
          ? new Date(parsed.data.weekStartDate)
          : plan.weekStartDate;
      const normalizedMonday = normalizeToMonday(anchorDate);
      const { fullWeekCount, singleDayCount } = await countPlansForWeek(
        normalizedMonday,
        new ObjectId(weekPlanId)
      );

      if (!isSingleDay && fullWeekCount >= 1) {
        return NextResponse.json(
          { error: "A full-week plan already exists for this week." },
          { status: 409 }
        );
      }
      if (isSingleDay && singleDayCount >= 6) {
        return NextResponse.json(
          { error: "Only 6 single-day plans are allowed per week." },
          { status: 409 }
        );
      }
    }

    if (parsed.data.weekStartDate != null) {
      updates.weekStartDate = normalizeToMonday(new Date(parsed.data.weekStartDate));
    }
    if (parsed.data.assignedCookId != null) {
      updates.assignedCookId = new ObjectId(parsed.data.assignedCookId);
    }
    if (parsed.data.name !== undefined) {
      const trimmedName = parsed.data.name.trim();
      if (trimmedName) {
        updates.name = trimmedName;
      }
    }
    if (parsed.data.days != null) {
      updates.days = parsed.data.days.map((d) => ({
        date: new Date(d.date),
        dayType: d.dayType as DayType,
        headcount: d.headcount,
        menuItems: d.menuItems,
        assignedCookId: d.assignedCookId
          ? new ObjectId(d.assignedCookId)
          : undefined,
      }));
    }
    if (parsed.data.notes !== undefined) {
      updates.notes = parsed.data.notes;
    }

    const updated = await updateWeekPlan(new ObjectId(weekPlanId), updates);
    if (!updated) {
      return NextResponse.json(
        { error: "Update failed or no changes" },
        { status: 400 }
      );
    }

    const updatedPlan = await getWeekPlanById(new ObjectId(weekPlanId));
    return NextResponse.json({
      weekPlan: updatedPlan
        ? serializeWeekPlanForResponse(updatedPlan)
        : null,
      message: "Week plan updated",
    });
  } catch (error) {
    console.error("Error updating week plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
