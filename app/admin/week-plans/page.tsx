"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

type WeekPlanSummary = {
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

export default function AdminWeekPlansPage() {
  const [weekPlans, setWeekPlans] = useState<WeekPlanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/week-plans");
        if (!res.ok) throw new Error("Failed to fetch week plans");
        const data = await res.json();
        setWeekPlans(data.weekPlans ?? []);
      } catch (err) {
        console.error(err);
        setError("Failed to load week plans.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const dayTypeLabel: Record<string, string> = {
    no_thali: "No thali",
    thali: "Thali",
    jamaat_wide_thali: "Jamaat wide thali",
    miqaat: "Miqaat",
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin" className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Week Plans</h1>
            <p className="text-sm text-slate-600">
              Create and manage weekly menus and single-day plans
            </p>
          </div>
        </div>

        <div className="mb-6">
          <Button asChild size="lg" className="h-14 w-full text-base font-medium sm:w-auto">
            <Link href="/admin/week-plans/new">
              <Plus className="mr-2 h-5 w-5" />
              Create Week Plan
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="mt-3 h-14 w-full text-base font-medium sm:ml-3 sm:mt-0 sm:w-auto">
            <Link href="/admin/week-plans/new?single=1">
              <Calendar className="mr-2 h-5 w-5" />
              Create Single-Day Plan
            </Link>
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : weekPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-base text-slate-600">No week plans yet.</p>
              <Button asChild className="mt-4 h-12">
                <Link href="/admin/week-plans/new">Create your first week plan</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {weekPlans.map((plan) => {
              const isSingleDay = plan.days.length === 1;
              const firstDate = plan.days[0]?.date;
              const lastDate = plan.days[plan.days.length - 1]?.date;
              const dateRange =
                isSingleDay
                  ? formatDate(firstDate ?? plan.weekStartDate)
                  : `${formatDate(firstDate ?? plan.weekStartDate)} – ${formatDate(lastDate ?? plan.weekStartDate)}`;
              return (
                <li key={plan._id}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">
                          <Link
                            href={`/admin/week-plans/${plan._id}`}
                            className="hover:underline"
                          >
                            {isSingleDay ? "Single-day plan" : "Week plan"}
                          </Link>
                        </CardTitle>
                        <Badge variant={isSingleDay ? "secondary" : "default"}>
                          {isSingleDay ? "1 day" : `${plan.days.length} days`}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {dateRange}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {plan.days.slice(0, 7).map((day, i) => (
                          <span
                            key={i}
                            className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-700"
                          >
                            {dayTypeLabel[day.dayType] ?? day.dayType}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3">
                        <Button asChild variant="outline" size="sm" className="h-11">
                          <Link href={`/admin/week-plans/${plan._id}`}>
                            View details & carts
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
