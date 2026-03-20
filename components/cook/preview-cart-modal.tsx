"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CartItemsList, type CartItemDisplay } from "@/components/admin/cart-items-list";
import { WeekMenuSummary, type WeekMenuDay } from "@/components/cook/week-menu-summary";

type PreviewCartModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartId: string | null;
  userId: string | null;
  weekPlan: {
    _id: string;
    name?: string;
    weekStartDate?: string;
    assignedCookId: string;
    days: Array<{
      date: string;
      dayType?: string;
      headcount?: number;
      menuItems?: string[];
      assignedCookId: string | null;
    }>;
  } | null;
};

type CartItemFromApi = {
  nameSnapshot: string;
  quantityRequested: number;
  unit: string;
  categorySnapshot?: string;
};

export function PreviewCartModal({
  open,
  onOpenChange,
  cartId,
  userId,
  weekPlan,
}: PreviewCartModalProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItemDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    if (!cartId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/carts/${String(cartId)}`);
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      const raw = (data.items ?? []) as CartItemFromApi[];
      setItems(
        raw.map((it) => ({
          nameSnapshot: it.nameSnapshot ?? "",
          quantityRequested: Number(it.quantityRequested) || 0,
          unit: it.unit ?? "",
          categorySnapshot: it.categorySnapshot,
        }))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load cart.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [cartId]);

  useEffect(() => {
    if (open && cartId) {
      fetchCart();
    } else if (!open) {
      setItems([]);
      setError(null);
    }
  }, [open, cartId, fetchCart]);

  const myDays: WeekMenuDay[] =
    weekPlan && userId && Array.isArray(weekPlan.days)
      ? weekPlan.days
          .filter((day) => {
            const effective = day.assignedCookId ?? weekPlan.assignedCookId;
            return effective === userId;
          })
          .map((d) => {
            const dateVal = d.date as string | Date | null | undefined;
            const dateStr =
              typeof dateVal === "string"
                ? dateVal
                : dateVal instanceof Date
                  ? dateVal.toISOString().slice(0, 10)
                  : String(dateVal ?? "");
            return {
              date: dateStr,
              dayType: d.dayType ?? "thali",
              headcount: d.headcount ?? 0,
              menuItems: Array.isArray(d.menuItems) ? d.menuItems : [],
              assignedCookId: d.assignedCookId ?? null,
            };
          })
      : [];

  const handleEditCart = () => {
    onOpenChange(false);
    if (cartId) router.push(`/cook/cart/${cartId}/edit`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview cart</DialogTitle>
          <DialogDescription>
            Items in your cart and your cooking days this week.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Ingredients in cart</h3>
              <CartItemsList
                items={items}
                emptyMessage="No items in your cart yet."
                itemKeyPrefix={`preview-${cartId ?? ""}`}
              />
            </div>

            {myDays.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">This week you are cooking</h3>
                <WeekMenuSummary days={myDays} collapsible defaultOpen compact={false} />
              </div>
            )}

            {cartId && (
              <div className="pt-2 border-t border-slate-200">
                <Button onClick={handleEditCart} className="w-full" size="lg">
                  Edit cart
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
