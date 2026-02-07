"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

type WeekPlan = {
  _id: string;
  weekStartDate: string;
  days: Array<{
    date: string;
    isClosed: boolean;
    headcount: number;
    menuItems: string[];
  }>;
};

type Cart = {
  _id: string;
  status: "draft" | "submitted" | "finalized";
};

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

          // If week plan exists, check for existing cart
          if (fetchedWeekPlan) {
            // TODO: Add API endpoint to get cart by week plan
            // For now, we'll create cart on-demand in the cart builder page
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
                  This Week&apos;s Plan
                  <Badge className="ml-3 text-sm" variant="default">
                    Active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-base">
                  Week of {formatDate(weekPlan.weekStartDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Day Summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {weekPlan.days.slice(0, 7).map((day, index) => (
                    <div key={index}>
                      {index > 0 && (
                        <div className="my-3 border-t border-slate-200" />
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {getDayName(day.date)}
                          </span>
                          {day.isClosed ? (
                            <span className="text-red-600">Closed</span>
                          ) : (
                            <span className="text-slate-600">
                              {day.headcount} people
                            </span>
                          )}
                        </div>
                        {!day.isClosed && (
                          <p className="text-slate-700">
                            {day.menuItems.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

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
