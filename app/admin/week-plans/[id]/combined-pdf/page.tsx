"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type CombinedItem = {
  ingredientId: string;
  nameSnapshot: string;
  categorySnapshot: string;
  storeIdSnapshot: string | null;
  quantityRequested: number;
  unit: string;
  quantityToBuy: number | null;
};

type Store = { _id: string; name: string };

export default function CombinedPdfPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const groupByParam = searchParams.get("groupBy");
  const initialGroupBy = groupByParam === "store" ? "store" : "category";

  const [weekLabel, setWeekLabel] = useState<string>("");
  const [items, setItems] = useState<CombinedItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [groupBy, setGroupBy] = useState<"category" | "store">(initialGroupBy);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGroupBy(initialGroupBy);
  }, [initialGroupBy]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const [planRes, cartRes, storesRes] = await Promise.all([
          fetch(`/api/week-plans/${id}`),
          fetch(`/api/week-plans/${id}/combined-cart`),
          fetch("/api/admin/stores"),
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
        if (storesRes.ok) {
          const storesData = await storesRes.json();
          setStores(storesData.stores ?? []);
        }
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

  const storeNameById = useMemo(
    () => new Map(stores.map((s) => [s._id, s.name])),
    [stores]
  );

  const getStoreName = (storeId: string | null) =>
    storeId ? storeNameById.get(storeId) ?? "—" : "—";

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
  const byStore = new Map<string, CombinedItem[]>();
  for (const item of items) {
    const cat = item.categorySnapshot || "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);

    const storeKey = item.storeIdSnapshot ?? "__none__";
    if (!byStore.has(storeKey)) byStore.set(storeKey, []);
    byStore.get(storeKey)!.push(item);
  }
  const categories = [...byCategory.keys()].sort();
  const storeKeys = [...byStore.keys()].sort((a, b) => {
    const nameA = a === "__none__" ? "No store" : getStoreName(a);
    const nameB = b === "__none__" ? "No store" : getStoreName(b);
    return nameA.localeCompare(nameB);
  });

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 print:bg-white print:py-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/week-plans/${id}`} className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Group by</Label>
              <RadioGroup
                value={groupBy}
                onValueChange={(v) => setGroupBy(v as "category" | "store")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="category" id="comb-pdf-cat" />
                  <Label htmlFor="comb-pdf-cat" className="font-normal cursor-pointer">Category</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="store" id="comb-pdf-store" />
                  <Label htmlFor="comb-pdf-store" className="font-normal cursor-pointer">Store</Label>
                </div>
              </RadioGroup>
            </div>
            <Button size="lg" className="h-12 px-6 w-fit" onClick={handlePrint}>
              Print / Save as PDF
            </Button>
          </div>
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
            {groupBy === "store" && " · By store"}
            {groupBy === "category" && " · By category"}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-slate-600">No items in combined cart.</p>
        ) : groupBy === "category" ? (
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
                          {item.nameSnapshot} ({getStoreName(item.storeIdSnapshot)})
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
        ) : (
          <div className="mt-6 space-y-6 print:mt-4 print:space-y-4">
            {storeKeys.map((key) => {
              const storeLabel = key === "__none__" ? "No store" : getStoreName(key);
              const storeItems = byStore.get(key)!;
              return (
                <Card key={key} className="print:shadow-none print:border print:border-slate-200">
                  <CardHeader className="pb-2 print:py-2">
                    <CardTitle className="text-base print:text-sm">
                      {storeLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 print:pt-0">
                    <ul className="space-y-2 print:space-y-1">
                      {storeItems.map((item) => (
                        <li
                          key={`${item.ingredientId}-${item.unit}`}
                          className="flex justify-between text-sm print:text-base"
                        >
                          <span className="font-medium text-slate-800">
                            {item.nameSnapshot} ({item.categorySnapshot || "Other"})
                          </span>
                          <span className="text-slate-600">
                            {item.quantityRequested} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
