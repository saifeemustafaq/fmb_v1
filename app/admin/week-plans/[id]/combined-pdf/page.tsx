"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type CombinedItem = {
  ingredientId: string;
  nameSnapshot: string;
  categorySnapshot: string;
  storeIdSnapshot: string | null;
  quantityRequested: number;
  unit: string;
  quantityToBuy: number | null;
};

export default function CombinedPdfPage() {
  const params = useParams();
  const id = params.id as string;

  const [weekLabel, setWeekLabel] = useState<string>("");
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const [planRes, cartRes] = await Promise.all([
          fetch(`/api/week-plans/${id}`),
          fetch(`/api/week-plans/${id}/combined-cart`),
        ]);
        if (!planRes.ok) throw new Error("Failed to fetch week plan");
        if (!cartRes.ok) throw new Error("Failed to fetch combined cart");

        const planData = await planRes.json();
        const cartData = await cartRes.json();

        const plan = planData.weekPlan;
        const days = plan?.days ?? [];
        const label =
          days.length === 1
            ? new Date((days[0]?.date ?? plan?.weekStartDate) + "T12:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric", year: "numeric" }
              )
            : `Week of ${new Date((plan?.weekStartDate ?? "") + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

        setWeekLabel(label);
        setItems(cartData.items ?? []);
      } catch (err) {
        console.error(err);
        setError("Failed to load combined cart.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-red-600">{error}</p>
          <Button asChild className="mt-4 h-12">
            <Link href={`/admin/week-plans/${id}`}>Back to week plan</Link>
          </Button>
        </div>
      </main>
    );
  }

  const byCategory = new Map<string, CombinedItem[]>();
  for (const item of items) {
    const cat = item.categorySnapshot || "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);
  }
  const categories = [...byCategory.keys()].sort();

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 print:bg-white print:py-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/week-plans/${id}`} className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <Button size="lg" className="h-12 px-6" onClick={handlePrint}>
            Print / Save as PDF
          </Button>
        </div>

        <div className="print:mb-0">
          <h1 className="text-xl font-bold text-slate-900 print:text-lg">
            Combined Shopping List
          </h1>
          <p className="mt-1 text-sm text-slate-600 print:text-xs">
            {weekLabel} · Generated{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-slate-600">No items in combined cart.</p>
        ) : (
          <div className="mt-6 space-y-6 print:mt-4 print:space-y-4">
            {categories.map((category) => (
              <Card key={category} className="print:shadow-none print:border print:border-slate-200">
                <CardHeader className="pb-2 print:py-2">
                  <CardTitle className="text-base print:text-sm">
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 print:pt-0">
                  <ul className="space-y-2 print:space-y-1">
                    {byCategory.get(category)!.map((item) => (
                      <li
                        key={`${item.ingredientId}-${item.unit}`}
                        className="flex justify-between text-sm print:text-base"
                      >
                        <span className="font-medium text-slate-800">
                          {item.nameSnapshot}
                        </span>
                        <span className="text-slate-600">
                          {item.quantityRequested} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
