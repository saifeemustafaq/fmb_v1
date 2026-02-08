"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ShoppingCart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

type WeekPlanDetail = {
  _id: string;
  weekStartDate: string;
  assignedCookId: string;
  days: Array<{
    date: string;
    dayType: string;
    headcount: number;
    menuItems: string[];
    assignedCookId: string | null;
  }>;
  notes?: string;
  createdAt: string;
};

type CartSummary = {
  _id: string;
  weekPlanId: string;
  cookId: string;
  cookName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CombinedItem = {
  ingredientId: string;
  nameSnapshot: string;
  categorySnapshot: string;
  storeIdSnapshot: string | null;
  quantityRequested: number;
  unit: string;
  quantityToBuy: number | null;
};

const dayTypeLabel: Record<string, string> = {
  no_thali: "No thali",
  thali: "Thali",
  jamaat_wide_thali: "Jamaat wide thali",
  miqaat: "Miqaat",
};

export default function AdminWeekPlanDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [plan, setPlan] = useState<WeekPlanDetail | null>(null);
  const [carts, setCarts] = useState<CartSummary[]>([]);
  const [combinedItems, setCombinedItems] = useState<CombinedItem[] | null>(null);
  const [showCombined, setShowCombined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/week-plans/${id}`);
        if (!res.ok) throw new Error("Failed to fetch week plan");
        const data = await res.json();
        setPlan(data.weekPlan);
      } catch (err) {
        console.error(err);
        setError("Failed to load week plan.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlan();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchCarts = async () => {
      try {
        const res = await fetch(`/api/week-plans/${id}/carts`);
        if (res.ok) {
          const data = await res.json();
          setCarts(data.carts ?? []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCarts();
  }, [id]);

  const fetchCombinedCart = async () => {
    if (!id) return;
    setShowCombined(true);
    try {
      const res = await fetch(`/api/week-plans/${id}/combined-cart`);
      if (!res.ok) throw new Error("Failed to fetch combined cart");
      const data = await res.json();
      setCombinedItems(data.items ?? []);
    } catch (err) {
      console.error(err);
      setCombinedItems([]);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toISOString().slice(0, 10);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-red-600">{error ?? "Week plan not found."}</p>
          <Button asChild className="mt-4 h-12">
            <Link href="/admin/week-plans">Back to week plans</Link>
          </Button>
        </div>
      </main>
    );
  }

  const isSingleDay = plan.days.length === 1;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/week-plans" className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isSingleDay ? "Single-day plan" : "Week plan"}
            </h1>
            <p className="text-sm text-slate-600">
              {plan.days[0]?.date
                ? new Date(plan.days[0].date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : formatDate(plan.weekStartDate)}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Days</CardTitle>
              <CardDescription>Day type, headcount, menu, assigned cook</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {plan.days.map((day, i) => (
                  <li
                    key={day.date}
                    className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <span className="font-medium text-slate-900">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {dayTypeLabel[day.dayType] ?? day.dayType}
                      </Badge>
                    </div>
                    {day.dayType !== "no_thali" && (
                      <div className="text-sm text-slate-600">
                        Headcount: {day.headcount}
                        {day.menuItems.length > 0 && (
                          <span className="ml-2">
                            · {day.menuItems.join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Carts</CardTitle>
              <CardDescription>
                One cart per cook; review or build from here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                size="lg"
                className="h-14 w-full text-base font-medium"
                onClick={fetchCombinedCart}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                View combined cart
              </Button>
              {showCombined && combinedItems !== null && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 font-semibold text-slate-900">Combined shopping list</h3>
                  {combinedItems.length === 0 ? (
                    <p className="text-sm text-slate-600">No items in any cart yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {combinedItems.map((item) => (
                        <li
                          key={item.ingredientId + item.unit}
                          className="flex justify-between text-sm"
                        >
                          <span className="font-medium text-slate-800">
                            {item.nameSnapshot}
                          </span>
                          <span className="text-slate-600">
                            {item.quantityRequested} {item.unit}
                            {item.categorySnapshot ? ` · ${item.categorySnapshot}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 h-11"
                    asChild
                  >
                    <Link href={`/admin/week-plans/${id}/combined-pdf`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download PDF
                    </Link>
                  </Button>
                </div>
              )}
              {carts.length === 0 ? (
                <p className="text-sm text-slate-600">No carts created yet. Cooks will create carts when they open &quot;Build cart&quot;.</p>
              ) : (
                <ul className="space-y-2">
                  {carts.map((cart) => (
                    <li key={cart._id}>
                      <Link
                        href={`/admin/carts/${cart._id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">
                          {cart.cookName}
                        </span>
                        <Badge
                          variant={
                            cart.status === "submitted"
                              ? "default"
                              : cart.status === "finalized"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {cart.status}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
