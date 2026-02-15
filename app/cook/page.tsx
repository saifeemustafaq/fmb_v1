"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ShoppingCart, History } from "lucide-react";
import { WeekMenuSummary, type WeekMenuDay } from "@/components/cook/week-menu-summary";

type WeekPlan = {
  _id: string;
  name?: string;
  weekStartDate: string;
  assignedCookId: string;
  days: Array<{
    date: string;
    dayType: string;
    isClosed?: boolean;
    headcount: number;
    menuItems: string[];
    assignedCookId: string | null;
  }>;
};

type Cart = {
  _id: string;
  status: "draft" | "submitted" | "finalized";
};

type CartListItem = {
  _id: string;
  status: "draft" | "submitted" | "finalized";
  itemCount: number;
  weekName?: string | null;
  weekStartDate: string | null;
  updatedAt: string;
};

type DashboardState =
  | "noWeekAssigned"
  | "assignedNoCart"
  | "assignedDraftCart"
  | "assignedSubmittedCart"
  | "assignedFinalizedCart";

function getMyDays(plan: WeekPlan, userId: string) {
  const defaultCookId = plan.assignedCookId;
  return plan.days.filter((day) => {
    const effectiveCookId = day.assignedCookId ?? defaultCookId;
    return effectiveCookId === userId;
  });
}

function formatWeekTitle(weekName: string | undefined, weekStartDate: string, daysLength: number) {
  if (weekName?.trim()) return weekName;
  const date = new Date(weekStartDate);
  if (daysLength === 1) return "Single-day plan";
  return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function formatRecentWeekLabel(weekName: string | null | undefined, weekStartDate: string | null) {
  if (weekName?.trim()) return weekName;
  if (!weekStartDate) return "Unknown week";
  const date = new Date(weekStartDate);
  return `Week of ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatRecentUpdatedDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDashboardState(weekPlan: WeekPlan | null, cart: Cart | null): DashboardState {
  if (!weekPlan) return "noWeekAssigned";
  if (!cart) return "assignedNoCart";
  if (cart.status === "draft") return "assignedDraftCart";
  if (cart.status === "submitted") return "assignedSubmittedCart";
  return "assignedFinalizedCart";
}

function CookDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [recentCart, setRecentCart] = useState<CartListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const submittedBanner = searchParams.get("submitted") === "1";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const { user } = await meRes.json();
        setUserId(user.id);

        const weekRes = await fetch(`/api/week-plans/cook/${user.id}`);
        if (weekRes.ok) {
          const { weekPlan: fetchedWeekPlan } = await weekRes.json();
          setWeekPlan(fetchedWeekPlan);

          if (fetchedWeekPlan) {
            const cartRes = await fetch(
              `/api/carts?weekPlanId=${encodeURIComponent(fetchedWeekPlan._id)}`
            );
            if (cartRes.ok) {
              const { cart: existingCart } = await cartRes.json();
              setCart(existingCart ?? null);
            }
          }
        }

        const historyRes = await fetch("/api/carts");
        if (historyRes.ok) {
          const { carts } = await historyRes.json();
          if (Array.isArray(carts) && carts.length > 0) {
            setRecentCart(carts[0] as CartListItem);
          } else {
            setRecentCart(null);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  const myDaysForSummary: WeekMenuDay[] = weekPlan && userId
    ? getMyDays(weekPlan, userId).map((d) => ({
        date: d.date,
        dayType: d.dayType,
        headcount: d.headcount,
        menuItems: d.menuItems ?? [],
        assignedCookId: d.assignedCookId,
      }))
    : [];
  const dashboardState = getDashboardState(weekPlan, cart);
  const hasAssignedDays = myDaysForSummary.length > 0;
  const weekLabel = weekPlan
    ? formatWeekTitle(weekPlan.name, weekPlan.weekStartDate, weekPlan.days.length)
    : null;
  const weekSummaryOpenByDefault =
    dashboardState === "assignedNoCart" || dashboardState === "assignedDraftCart";

  const topHeading =
    dashboardState === "noWeekAssigned"
      ? "No week assigned"
      : dashboardState === "assignedSubmittedCart"
        ? "Cart submitted"
        : dashboardState === "assignedFinalizedCart"
          ? "Cart finalized"
          : weekLabel;

  const topDescription =
    dashboardState === "noWeekAssigned"
      ? "Wait for admin to assign a weekly plan to you"
      : dashboardState === "assignedSubmittedCart"
        ? `Your ${weekLabel?.toLowerCase() ?? "cart"} is awaiting admin review.`
        : dashboardState === "assignedFinalizedCart"
          ? `Your ${weekLabel?.toLowerCase() ?? "cart"} has been finalized.`
          : "Your assigned plan";

  const statusPill =
    dashboardState === "assignedNoCart" || dashboardState === "assignedDraftCart"
      ? "Action needed"
      : dashboardState === "assignedSubmittedCart"
        ? "Waiting for admin"
        : dashboardState === "assignedFinalizedCart"
          ? "Completed"
          : "Not assigned";

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Success banner after submit */}
        {submittedBanner && (
          <div
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-base text-green-800"
            role="status"
          >
            Cart submitted for review.
          </div>
        )}

        <section>
          <h1 className="text-xl font-semibold text-slate-900">Cook dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Follow this order: check assignment, then take action.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current assignment</p>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {statusPill}
              </span>
            </div>
            <div className="mt-2">
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{topHeading}</h2>
              <p className="mt-1 text-base text-slate-600">{topDescription}</p>
            </div>
          </div>

          {weekPlan && hasAssignedDays && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">This week you&apos;re cooking</p>
              <WeekMenuSummary
                days={myDaysForSummary}
                collapsible
                defaultOpen={weekSummaryOpenByDefault}
                compact={false}
              />
            </div>
          )}

          {/* Primary CTA by state */}
          {hasAssignedDays && dashboardState === "assignedNoCart" && (
            <Button
              asChild
              size="lg"
              className="mt-4 min-h-[48px] h-14 w-full text-base font-semibold focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Link href="/cook/cart/new">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Build cart now
              </Link>
            </Button>
          )}
          {hasAssignedDays && dashboardState === "assignedDraftCart" && cart && (
            <Button
              asChild
              size="lg"
              className="mt-4 min-h-[48px] h-14 w-full text-base font-semibold focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Link href={`/cook/cart/${cart._id}`}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Continue cart
              </Link>
            </Button>
          )}
          {dashboardState === "assignedSubmittedCart" && cart && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-h-[48px] h-12 w-full text-base font-medium focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Link href={`/cook/cart/${cart._id}`}>View current cart</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="min-h-[48px] h-12 w-full text-base font-semibold focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Link href={`/cook/cart/${cart._id}/edit`}>Edit current cart</Link>
              </Button>
            </div>
          )}
          {dashboardState === "assignedFinalizedCart" && cart && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="mt-4 min-h-[48px] h-12 w-full text-base font-medium focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Link href={`/cook/cart/${cart._id}`}>View current cart</Link>
            </Button>
          )}

          {weekPlan && !hasAssignedDays && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-800">
              No days are assigned to you in this plan.
            </div>
          )}
          {dashboardState === "noWeekAssigned" && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-700">
              You don&apos;t have an active week plan yet. Check back later or contact your admin.
            </div>
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="text-base font-semibold text-slate-900">More</h3>
          {recentCart && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-h-[48px] h-14 w-full justify-between text-left text-base font-medium"
            >
              <Link href={`/cook/cart/${recentCart._id}`}>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="font-semibold text-slate-900">Recent cart</span>
                  <span className="text-sm font-normal text-slate-600">
                    {formatRecentWeekLabel(recentCart.weekName, recentCart.weekStartDate)} · {recentCart.itemCount}{" "}
                    {recentCart.itemCount === 1 ? "item" : "items"}
                  </span>
                </span>
                <span className="text-sm text-slate-500">
                  {recentCart.status === "draft" ? "Open" : "View"}
                </span>
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-h-[48px] h-14 w-full justify-between text-left text-base font-medium"
          >
            <Link href="/cook/history">
              <span className="flex min-w-0 flex-col items-start">
                <span className="font-semibold text-slate-900">Cart history</span>
                <span className="text-sm font-normal text-slate-600">View your past carts and shopping lists</span>
              </span>
              <History className="h-5 w-5 shrink-0 text-slate-500" />
            </Link>
          </Button>
        </section>

        <section>
          <Collapsible open={showHelp} onOpenChange={setShowHelp}>
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-[48px]">
              <span>How it works</span>
              {showHelp ? (
                <ChevronUp className="h-5 w-5 shrink-0 text-slate-600" />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-600" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-b-lg border border-t-0 border-slate-200 bg-white px-4 py-3">
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Check your assigned days first</li>
                  <li>• Build or continue your cart</li>
                  <li>• Submit cart for admin review</li>
                  <li>• Use Cart history for previous carts</li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </div>
    </main>
  );
}

export default function CookPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white">
          <Spinner className="h-8 w-8" />
        </main>
      }
    >
      <CookDashboardContent />
    </Suspense>
  );
}
