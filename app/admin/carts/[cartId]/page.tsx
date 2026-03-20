"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  AdminCartItemsEditable,
  type AdminCartItemEditable,
} from "@/components/admin/admin-cart-items-editable";
import { CartItemsList } from "@/components/admin/cart-items-list";

type CartDetail = {
  _id: string;
  weekPlanId: string;
  cookId: string;
  cookName?: string;
  weekLabel?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type RawItem = {
  _id: string;
  nameSnapshot: string;
  quantityRequested: number;
  unit: string;
  categorySnapshot?: string;
};

function toEditableItems(raw: RawItem[]): AdminCartItemEditable[] {
  return raw.map((it) => ({
    _id: it._id,
    nameSnapshot: it.nameSnapshot,
    quantityRequested: it.quantityRequested,
    unit: it.unit,
    categorySnapshot: it.categorySnapshot ?? undefined,
    originalQuantity: it.quantityRequested,
  }));
}

export default function AdminCartDetailPage() {
  const params = useParams();
  const cartId = params.cartId as string;

  const [cart, setCart] = useState<CartDetail | null>(null);
  const [items, setItems] = useState<AdminCartItemEditable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!cartId) return;
    const fetchCart = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/carts/${cartId}`);
        if (!res.ok) throw new Error("Failed to fetch cart");
        const data = await res.json();
        setCart(data.cart);
        const raw = data.items ?? [];
        setItems(toEditableItems(raw));
      } catch (err) {
        console.error(err);
        setError("Failed to load cart.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCart();
  }, [cartId]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (!cartId || cart?.status === "finalized") return;
    setUpdatingItemId(itemId);
    try {
      const res = await fetch(`/api/carts/${cartId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setItems((prev) =>
        prev.map((it) =>
          it._id === itemId
            ? { ...it, quantityRequested: newQuantity }
            : it
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  if (error || !cart) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-red-600">{error ?? "Cart not found."}</p>
          <Button asChild className="mt-4 h-12">
            <Link href="/admin/carts">Back to Carts</Link>
          </Button>
        </div>
      </main>
    );
  }

  const title = cart.cookName
    ? `${cart.cookName}'s cart`
    : "Cart";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/carts" className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <nav className="text-sm text-slate-600">
              <Link href="/admin/carts" className="underline hover:no-underline">
                Carts
              </Link>
              <span className="mx-2">/</span>
              <span className="text-slate-900">{title}</span>
            </nav>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {cart.weekLabel && (
              <p className="text-sm text-slate-600">{cart.weekLabel}</p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Items</CardTitle>
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
            </div>
          </CardHeader>
          <CardContent>
            {(cart.notes ?? "").trim() ? (
              <div className="mb-4 rounded border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                <p className="font-medium text-slate-600">Note</p>
                <p className="mt-1">{cart.notes}</p>
              </div>
            ) : null}
            {cart.status === "finalized" ? (
              <CartItemsList
                items={items.map((it) => ({
                  nameSnapshot: it.nameSnapshot,
                  quantityRequested: it.quantityRequested,
                  unit: it.unit,
                  categorySnapshot: it.categorySnapshot,
                }))}
                emptyMessage="No items in this cart."
                itemKeyPrefix={cart._id}
              />
            ) : (
              <AdminCartItemsEditable
                items={items}
                emptyMessage="No items in this cart."
                itemKeyPrefix={cart._id}
                onQuantityChange={handleQuantityChange}
                isUpdating={updatingItemId !== null}
              />
            )}
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link href={`/admin/week-plans/${cart.weekPlanId}`}>
              View week plan
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
