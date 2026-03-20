"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CombinedCartModal } from "@/components/admin/combined-cart-modal";

type CartRow = {
  _id: string;
  weekPlanId: string;
  cookId: string;
  cookName: string;
  status: string;
  weekStartDate: string | null;
  weekLabel: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function AdminCartsPage() {
  const [carts, setCarts] = useState<CartRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeekPlanId, setSelectedWeekPlanId] = useState<string | null>(null);
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchCarts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/carts");
        if (!res.ok) throw new Error("Failed to fetch carts");
        const data = await res.json();
        setCarts(data.carts ?? []);
      } catch (err) {
        console.error(err);
        setError("Failed to load carts.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCarts();
  }, []);

  // Group by week; sort groups by most recent cart in that week
  const groupsByWeek = carts.reduce<Record<string, CartRow[]>>((acc, cart) => {
    const key = cart.weekPlanId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cart);
    return acc;
  }, {});
  const weekIds = Object.keys(groupsByWeek).sort((a, b) => {
    const aMax = Math.max(...groupsByWeek[a].map((c) => new Date(c.updatedAt).getTime()));
    const bMax = Math.max(...groupsByWeek[b].map((c) => new Date(c.updatedAt).getTime()));
    return bMax - aMax;
  });

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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Carts</h1>
          <p className="mt-1 text-sm text-slate-600">
            Combined carts by week plan — one entry per week; click to view merged items from all cooks
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Combined carts</CardTitle>
            <CardDescription>
              One row per week plan. Click a row to view the combined cart (all cooks merged).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carts.length === 0 ? (
              <p className="text-sm text-slate-600">No carts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="pb-2 pr-4 font-medium">Week</th>
                      <th className="pb-2 pr-4 font-medium">Cooks</th>
                      <th className="pb-2 font-medium">Last updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekIds.map((weekPlanId) => {
                      const weekCarts = groupsByWeek[weekPlanId];
                      const weekLabel = weekCarts[0]?.weekLabel ?? weekCarts[0]?.weekStartDate ?? "—";
                      const cookCount = weekCarts.length;
                      const lastUpdated = weekCarts.reduce(
                        (max, c) => (new Date(c.updatedAt).getTime() > max ? new Date(c.updatedAt).getTime() : max),
                        0
                      );
                      return (
                        <tr
                          key={weekPlanId}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                          onClick={() => {
                            setSelectedWeekPlanId(weekPlanId);
                            setSelectedWeekLabel(weekCarts[0]?.weekLabel ?? weekCarts[0]?.weekStartDate ?? null);
                            setModalOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedWeekPlanId(weekPlanId);
                              setSelectedWeekLabel(weekCarts[0]?.weekLabel ?? weekCarts[0]?.weekStartDate ?? null);
                              setModalOpen(true);
                            }
                          }}
                        >
                          <td className="py-3 pr-4 text-slate-800">{weekLabel}</td>
                          <td className="py-3 pr-4 font-medium text-slate-900">
                            {cookCount} cook{cookCount === 1 ? "" : "s"}
                          </td>
                          <td className="py-3 text-slate-600">
                            {lastUpdated
                              ? new Date(lastUpdated).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <CombinedCartModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setSelectedWeekPlanId(null);
              setSelectedWeekLabel(null);
            }
          }}
          weekPlanId={selectedWeekPlanId}
          weekLabel={selectedWeekLabel}
        />
      </div>
    </main>
  );
}
