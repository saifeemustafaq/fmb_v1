import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  countPlansForWeek,
  createWeekPlan,
  listAllWeekPlans,
  normalizeToMonday,
  serializeWeekPlanForResponse,
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

const createWeekPlanSchema = z.object({
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStartDate must be YYYY-MM-DD"),
  assignedCookId: z.string().refine((id) => ObjectId.isValid(id), {
    message: "Invalid assignedCookId",
  }),
  name: z.string().optional(),
  days: z
    .array(daySchema)
    .min(1)
    .max(7)
    .refine((days) => days.length === 1 || days.length === 7, {
      message: "Plan must be either single-day (1 day) or full-week (7 days)",
    }),
  notes: z.string().optional(),
});

export async function GET() {
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

    const plans = await listAllWeekPlans();
    return NextResponse.json({
      weekPlans: plans.map(serializeWeekPlanForResponse),
    });
  } catch (error) {
    console.error("Error listing week plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = createWeekPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { weekStartDate, assignedCookId, days, notes, name } = parsed.data;
    const isSingleDay = days.length === 1;
    const anchorDate = isSingleDay ? new Date(days[0].date) : new Date(weekStartDate);
    const normalizedMonday = normalizeToMonday(anchorDate);
    const { fullWeekCount, singleDayCount } = await countPlansForWeek(normalizedMonday);

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

    const weekPlanData = {
      weekStartDate: normalizedMonday,
      createdByAdminId: new ObjectId(user.id),
      assignedCookId: new ObjectId(assignedCookId),
      name: name?.trim() ? name.trim() : undefined,
      days: days.map((d) => ({
        date: new Date(d.date),
        dayType: d.dayType as DayType,
        headcount: d.headcount,
        menuItems: d.menuItems,
        assignedCookId: d.assignedCookId
          ? new ObjectId(d.assignedCookId)
          : undefined,
      })),
      notes,
    };

    const id = await createWeekPlan(weekPlanData);
    return NextResponse.json(
      { weekPlanId: id.toString(), message: "Week plan created" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating week plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
