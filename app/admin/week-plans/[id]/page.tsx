"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CartItemsList, type CartItemDisplay } from "@/components/admin/cart-items-list";
import { CartDetailModal } from "@/components/admin/cart-detail-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WeekPlanDetail = {
  _id: string;
  weekStartDate: string;
  name?: string;
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

type CookSummary = {
  _id: string;
  name: string;
  role: string;
};

const dayTypeLabel: Record<string, string> = {
  no_thali: "No thali",
  thali: "Thali",
  jamaat_wide_thali: "Jamaat wide thali",
  miqaat: "Miqaat",
};

function formatLongDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function AdminWeekPlanDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [plan, setPlan] = useState<WeekPlanDetail | null>(null);
  const [carts, setCarts] = useState<CartSummary[]>([]);
  const [combinedItems, setCombinedItems] = useState<CartItemDisplay[] | null>(null);
  const [cartItemsByCartId, setCartItemsByCartId] = useState<Record<string, CartItemDisplay[]>>({});
  const [loadingCartId, setLoadingCartId] = useState<string | null>(null);
  const [expandedCartId, setExpandedCartId] = useState<string | null>(null);
  const [stores, setStores] = useState<{ _id: string; name: string }[]>([]);
  const [cookNameById, setCookNameById] = useState<Record<string, string>>({});
  const [combinedItemsRaw, setCombinedItemsRaw] = useState<Array<{ nameSnapshot: string; quantityRequested: number; unit: string; categorySnapshot?: string; storeIdSnapshot?: string | null }>>([]);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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
    const fetchCooks = async () => {
      try {
        const res = await fetch("/api/admin/users?role=cook");
        if (!res.ok) return;
        const data = await res.json();
        const users: CookSummary[] = Array.isArray(data.users) ? data.users : [];
        const map: Record<string, string> = {};
        for (const user of users) {
          if (user.role === "cook") {
            map[user._id] = user.name;
          }
        }
        setCookNameById(map);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCooks();
  }, []);

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

  useEffect(() => {
    if (!id) return;
    const fetchCombined = async () => {
      try {
        const res = await fetch(`/api/week-plans/${id}/combined-cart`);
        if (!res.ok) throw new Error("Failed to fetch combined cart");
        const data = await res.json();
        const raw = data.items ?? [];
        setCombinedItemsRaw(
          raw.map((it: { nameSnapshot: string; quantityRequested: number; unit: string; categorySnapshot?: string; storeIdSnapshot?: string | null }) => ({
            nameSnapshot: it.nameSnapshot,
            quantityRequested: it.quantityRequested,
            unit: it.unit,
            categorySnapshot: it.categorySnapshot ?? undefined,
            storeIdSnapshot: it.storeIdSnapshot ?? undefined,
          }))
        );
        setCombinedItems(
          raw.map((it: { nameSnapshot: string; quantityRequested: number; unit: string; categorySnapshot?: string }) => ({
            nameSnapshot: it.nameSnapshot,
            quantityRequested: it.quantityRequested,
            unit: it.unit,
            categorySnapshot: it.categorySnapshot ?? undefined,
          }))
        );
      } catch (err) {
        console.error(err);
        setCombinedItems([]);
        setCombinedItemsRaw([]);
      }
    };
    fetchCombined();
  }, [id]);

  const requestedCartIdsRef = useRef<Set<string>>(new Set());
  const fetchCartItems = useCallback(async (cartId: string) => {
    if (requestedCartIdsRef.current.has(cartId)) return;
    requestedCartIdsRef.current.add(cartId);
    setLoadingCartId(cartId);
    try {
      const res = await fetch(`/api/carts/${cartId}`);
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      const raw = data.items ?? [];
      const items: CartItemDisplay[] = raw.map(
        (it: { nameSnapshot: string; quantityRequested: number; unit: string; categorySnapshot?: string }) => ({
          nameSnapshot: it.nameSnapshot,
          quantityRequested: it.quantityRequested,
          unit: it.unit,
          categorySnapshot: it.categorySnapshot ?? undefined,
        })
      );
      setCartItemsByCartId((prev) => ({ ...prev, [cartId]: items }));
    } catch (err) {
      console.error(err);
      setCartItemsByCartId((prev) => ({ ...prev, [cartId]: [] }));
    } finally {
      setLoadingCartId(null);
    }
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toISOString().slice(0, 10);

  const fetchStoresIfNeeded = useCallback(async (): Promise<Array<{ _id: string; name: string }>> => {
    if (stores.length > 0) return stores;
    try {
      const res = await fetch("/api/admin/stores");
      if (!res.ok) return [];
      const data = await res.json();
      const fetchedStores = data.stores ?? [];
      setStores(fetchedStores);
      return fetchedStores;
    } catch {
      return [];
    }
  }, [stores]);

  const downloadCombinedCsv = async () => {
    const storesForCsv = await fetchStoresIfNeeded();
    const storeNameById = new Map(storesForCsv.map((s: { _id: string; name: string }) => [s._id, s.name]));
    const header = "Name,Category,Store,Quantity,Unit";
    const rows = combinedItemsRaw.map((item) => {
      const storeName = item.storeIdSnapshot ? storeNameById.get(item.storeIdSnapshot) ?? "" : "";
      const name = `"${(item.nameSnapshot ?? "").replace(/"/g, '""')}"`;
      const category = `"${(item.categorySnapshot ?? "").replace(/"/g, '""')}"`;
      const store = `"${String(storeName).replace(/"/g, '""')}"`;
      return [name, category, store, item.quantityRequested, item.unit].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `combined-cart-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
  const firstDate = plan.days[0]?.date;
  const lastDate = plan.days[plan.days.length - 1]?.date;
  const planDateLabel = isSingleDay
    ? firstDate
      ? formatLongDate(firstDate)
      : formatDate(plan.weekStartDate)
    : firstDate && lastDate
      ? `${formatShortDate(firstDate)} - ${formatShortDate(lastDate)}`
      : formatDate(plan.weekStartDate);
  const defaultCookName = cookNameById[plan.assignedCookId] ?? "Unknown cook";
  const assignedCookIds = Array.from(
    new Set(plan.days.map((day) => day.assignedCookId ?? plan.assignedCookId))
  );
  const cartByCookId = new Map(carts.map((cart) => [cart.cookId, cart]));
  const submittedCookCount = assignedCookIds.filter((cookId) => {
    const cart = cartByCookId.get(cookId);
    return cart?.status === "submitted" || cart?.status === "finalized";
  }).length;
  const pendingCookCount = Math.max(0, assignedCookIds.length - submittedCookCount);
  const perCookRows = assignedCookIds.map((cookId) => ({
    cookId,
    cookName: cookNameById[cookId] ?? cartByCookId.get(cookId)?.cookName ?? "Unknown cook",
    cart: cartByCookId.get(cookId) ?? null,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/week-plans" className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {plan.name?.trim() || (isSingleDay ? "Single-day plan" : "Week plan")}
            </h1>
            <p className="text-sm text-slate-600">{planDateLabel}</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Plan overview</CardTitle>
              <CardDescription>Quick summary of plan type, range, and default cook</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isSingleDay ? "secondary" : "default"}>
                  {isSingleDay ? "Single-day" : "Full-week"}
                </Badge>
                <Badge variant="outline">
                  {plan.days.length} day{plan.days.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline">Default cook: {defaultCookName}</Badge>
              </div>
              {plan.notes?.trim() && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Notes:</span> {plan.notes}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Days</CardTitle>
              <CardDescription>Cook assignment, service type, headcount, and menu by day</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {plan.days.map((day) => {
                  const effectiveCookId = day.assignedCookId ?? plan.assignedCookId;
                  const isOverride =
                    !!day.assignedCookId && day.assignedCookId !== plan.assignedCookId;
                  const cookName = cookNameById[effectiveCookId] ?? "Unknown cook";
                  return (
                  <li
                    key={day.date}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="w-full space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-slate-900">
                          {formatLongDate(day.date)}
                        </span>
                        <Badge variant="secondary">
                          {dayTypeLabel[day.dayType] ?? day.dayType}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Cook: {cookName}</Badge>
                        <Badge variant="outline">
                          {isOverride ? "Day override" : "Default cook"}
                        </Badge>
                      </div>

                      {day.dayType !== "no_thali" ? (
                        <div className="space-y-2 text-sm text-slate-700">
                          <p>
                            <span className="font-medium text-slate-900">Headcount:</span>{" "}
                            {day.headcount}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">Menu:</span>{" "}
                            {day.menuItems.length > 0 ? day.menuItems.join(", ") : "No menu items"}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          No service on this day.
                        </div>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-lg">Carts</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="shrink-0">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        void downloadCombinedCsv();
                      }}
                      disabled={combinedItemsRaw.length === 0}
                    >
                      Download Combined CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/admin/week-plans/${id}/combined-pdf?groupBy=category`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download Combined PDF (by category)
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/admin/week-plans/${id}/combined-pdf?groupBy=store`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download Combined PDF (by store)
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {carts.map((cart) => (
                      <DropdownMenuItem key={cart._id} asChild>
                        <Link href={`/admin/carts/${cart._id}`}>
                          Download from {cart.cookName}&apos;s cart page
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>
                Track submissions and review combined or individual carts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                  Submitted: {submittedCookCount}/{assignedCookIds.length}
                </Badge>
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  Yet to submit: {pendingCookCount}
                </Badge>
              </div>

              {carts.length === 0 && combinedItems !== null && combinedItems.length === 0 ? (
                <p className="text-sm text-slate-600">No carts created yet. Cooks will create carts when they open &quot;Build cart&quot;.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 font-semibold text-slate-900">Combined shopping list</h3>
                    {combinedItems === null ? (
                      <p className="text-sm text-slate-600">Loading…</p>
                    ) : (
                      <CartItemsList
                        items={combinedItems}
                        emptyMessage="No items in any cart yet."
                        itemKeyPrefix="combined"
                      />
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Individual cook carts</h3>
                      <span className="text-xs text-slate-500">
                        {perCookRows.length} cook{perCookRows.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {perCookRows.map(({ cookId, cookName, cart }) => (
                        <div key={cookId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-slate-900">{cookName}</p>
                            <Badge
                              variant={
                                !cart
                                  ? "outline"
                                  : cart.status === "submitted"
                                    ? "default"
                                    : cart.status === "finalized"
                                      ? "secondary"
                                      : "outline"
                              }
                            >
                              {!cart ? "not started" : cart.status}
                            </Badge>
                          </div>
                          {!cart ? (
                            <p className="mt-2 text-sm text-slate-600">Cart not created yet.</p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/admin/carts/${cart._id}`}>View full cart</Link>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCartId(cart._id);
                                    setModalOpen(true);
                                  }}
                                >
                                  Quick view
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (expandedCartId === cart._id) {
                                      setExpandedCartId(null);
                                      return;
                                    }
                                    setExpandedCartId(cart._id);
                                    fetchCartItems(cart._id);
                                  }}
                                >
                                  {expandedCartId === cart._id ? "Hide inline items" : "Show inline items"}
                                </Button>
                              </div>
                              {expandedCartId === cart._id && (
                                loadingCartId === cart._id ? (
                                  <p className="text-sm text-slate-600">Loading…</p>
                                ) : (
                                  <CartItemsList
                                    items={cartItemsByCartId[cart._id] ?? []}
                                    emptyMessage="No items in this cart yet."
                                    itemKeyPrefix={cart._id}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <CartDetailModal
            open={modalOpen}
            onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) setSelectedCartId(null);
            }}
            cartId={selectedCartId}
          />
        </div>
      </div>
    </main>
  );
}
