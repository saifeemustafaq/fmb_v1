"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
import { Download, FileText } from "lucide-react";

type CombinedCartModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekPlanId: string | null;
  weekLabel?: string | null;
};

type CombinedItem = {
  nameSnapshot: string;
  categorySnapshot?: string;
  storeIdSnapshot?: string | null;
  quantityRequested: number;
  unit: string;
};

type Store = { _id: string; name: string };

function buildCsv(
  items: { nameSnapshot: string; categorySnapshot?: string; storeIdSnapshot?: string | null; quantityRequested: number; unit: string }[],
  storeNameById: Map<string, string>
): string {
  const header = "Name,Category,Store,Quantity,Unit";
  const rows = items.map((item) => {
    const storeName = item.storeIdSnapshot
      ? storeNameById.get(item.storeIdSnapshot) ?? item.storeIdSnapshot
      : "";
    const name = `"${(item.nameSnapshot ?? "").replace(/"/g, '""')}"`;
    const category = `"${(item.categorySnapshot ?? "").replace(/"/g, '""')}"`;
    const store = `"${storeName.toString().replace(/"/g, '""')}"`;
    return [name, category, store, item.quantityRequested, item.unit].join(",");
  });
  return [header, ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CombinedCartModal({
  open,
  onOpenChange,
  weekPlanId,
  weekLabel,
}: CombinedCartModalProps) {
  const [fullItems, setFullItems] = useState<CombinedItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCombined = useCallback(async () => {
    if (!weekPlanId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/week-plans/${weekPlanId}/combined-cart`);
      if (!res.ok) throw new Error("Failed to fetch combined cart");
      const data = await res.json();
      const raw = (data.items ?? []) as CombinedItem[];
      setFullItems(raw);
    } catch (err) {
      console.error(err);
      setError("Failed to load combined cart.");
      setFullItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [weekPlanId]);

  useEffect(() => {
    if (open && weekPlanId) {
      fetchCombined();
    } else if (!open) {
      setFullItems([]);
      setError(null);
    }
  }, [open, weekPlanId, fetchCombined]);

  useEffect(() => {
    if (open) {
      fetch("/api/admin/stores")
        .then((res) => (res.ok ? res.json() : { stores: [] }))
        .then((data) => setStores(data.stores ?? []))
        .catch(() => setStores([]));
    }
  }, [open]);

  const storeNameById = new Map(stores.map((s) => [s._id, s.name]));

  const displayItems: CartItemDisplay[] = fullItems.map((it) => ({
    nameSnapshot: it.nameSnapshot,
    quantityRequested: it.quantityRequested,
    unit: it.unit,
    categorySnapshot: it.categorySnapshot,
  }));

  const handleDownloadCsv = () => {
    const csv = buildCsv(fullItems, storeNameById);
    const label = (weekLabel ?? "combined").replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    downloadCsv(csv, `combined-cart-${label}-${weekPlanId ?? "cart"}.csv`);
  };

  const title = weekLabel?.trim() ? `Combined cart — ${weekLabel}` : "Combined cart";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Merged items from all cooks for this week plan.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto flex flex-col gap-4">
            <CartItemsList
              items={displayItems}
              emptyMessage="No items in any cart yet."
              itemKeyPrefix={`combined-${weekPlanId ?? ""}`}
            />
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                disabled={fullItems.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Download as CSV
              </Button>
              {weekPlanId && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/week-plans/${weekPlanId}/combined-pdf?groupBy=category`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      PDF (by category)
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/week-plans/${weekPlanId}/combined-pdf?groupBy=store`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      PDF (by store)
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/week-plans/${weekPlanId}`}>
                      View week plan &amp; per-cook carts
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
