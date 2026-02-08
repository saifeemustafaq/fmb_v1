"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const DAY_TYPE_LABELS: Record<string, string> = {
  no_thali: "No thali",
  thali: "Thali",
  jamaat_wide_thali: "Jamaat wide thali",
  miqaat: "Miqaat",
};

type WeekPlan = {
  _id: string;
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

function getMyDays(plan: WeekPlan, userId: string) {
  const defaultCookId = plan.assignedCookId;
  return plan.days.filter((day) => {
    const effectiveCookId = day.assignedCookId ?? defaultCookId;
    return effectiveCookId === userId;
  });
}

export default function CookDashboard() {
  const router = useRouter();
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const { user } = await meRes.json();
        setUserId(user.id);

        // Get assigned week plan
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Cook Dashboard</h1>
          <p className="mt-2 text-base text-slate-600">
            Build ingredient carts for assigned weekly menus
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Assigned Week Plan */}
          {weekPlan ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  Your Assigned Plan
                  <Badge className="ml-3 text-sm" variant="default">
                    Active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-base">
                  {weekPlan.days.length === 1
                    ? "Single-day plan"
                    : `Week of ${formatDate(weekPlan.weekStartDate)}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const myDays = getMyDays(weekPlan, userId ?? "");
                  return (
                    <>
                      <p className="text-sm font-medium text-slate-700">
                        Your days: {myDays.length === 0 ? "None" : myDays.map((d) => getDayName(d.date)).join(", ")}
                      </p>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        {myDays.length === 0 ? (
                          <p className="text-sm text-slate-600">No days assigned to you in this plan.</p>
                        ) : (
                          myDays.map((day, index) => (
                            <div key={day.date}>
                              {index > 0 && (
                                <div className="my-3 border-t border-slate-200" />
                              )}
                              <div className="space-y-2 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium">
                                    {getDayName(day.date)}
                                  </span>
                                  <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700">
                                    {DAY_TYPE_LABELS[day.dayType] ?? day.dayType}
                                  </span>
                                </div>
                                {day.dayType !== "no_thali" && (
                                  <>
                                    <span className="text-slate-600">
                                      {day.headcount} people
                                    </span>
                                    {day.menuItems.length > 0 && (
                                      <p className="text-slate-700">
                                        {day.menuItems.join(", ")}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Cart Action */}
                {cart ? (
                  <div className="space-y-3">
                    <Button
                      asChild
                      size="lg"
                      className="h-14 w-full text-base font-medium"
                    >
                      <Link href={`/cook/cart/${cart._id}`}>
                        Continue Building Cart
                      </Link>
                    </Button>
                    <p className="text-center text-sm text-slate-600">
                      Cart status: {cart.status}
                    </p>
                  </div>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="h-14 w-full text-base font-medium"
                  >
                    <Link href="/cook/cart/new">Build New Cart</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">No Week Assigned</CardTitle>
                <CardDescription className="text-base">
                  Wait for admin to assign a weekly plan to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-base text-slate-600">
                    You don&apos;t have an active week plan yet. Check back
                    later or contact your admin.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous Carts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Previous Carts</CardTitle>
              <CardDescription className="text-base">
                View your submitted carts and shopping lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 w-full text-base font-medium"
              >
                <Link href="/cook/history">View History</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-xl text-blue-900">
                Need Help?
              </CardTitle>
              <CardDescription className="text-base text-blue-700">
                Learn how to build ingredient carts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Search ingredients by name or category</li>
                <li>• Add missing ingredients if not found</li>
                <li>• Use + / - buttons to adjust quantities</li>
                <li>• Submit cart when ready for admin review</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
