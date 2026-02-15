"use client";

import { useMemo, useState } from "react";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";

export type CartItem = {
  _id: string;
  ingredientId: string;
  nameSnapshot: string;
  categorySnapshot: string;
  storeIdSnapshot: string | null;
  quantityRequested: number;
  unit: string;
};

interface CartItemsListProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isLoading?: boolean;
  readonly?: boolean;
}

export function CartItemsList({
  items,
  onUpdateQuantity,
  onRemoveItem,
  isLoading = false,
  readonly = false,
}: CartItemsListProps) {
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {}
  );

  const groupedItems = items.reduce((acc, item) => {
    const category = item.categorySnapshot;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);
  const categories = Object.keys(groupedItems).sort();
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item._id, item])),
    [items]
  );

  if (items.length === 0) {
    return (
      <div className="px-4">
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="py-4 px-4 text-center">
            <p className="text-base text-slate-600">
              Your cart is empty. Add ingredients to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getItemNumber = (category: string, indexInCategory: number) =>
    categories
      .slice(0, categories.indexOf(category))
      .reduce((sum, c) => sum + groupedItems[c].length, 0) + indexInCategory + 1;

  const getCurrentQuantity = (item: CartItem) => {
    const draft = quantityDrafts[item._id];
    const parsed = Number.parseInt(draft ?? "", 10);
    return Number.isNaN(parsed) || parsed < 1 ? item.quantityRequested : parsed;
  };

  const setDraftForItem = (itemId: string, value: string) => {
    setQuantityDrafts((prev) => ({ ...prev, [itemId]: value }));
  };

  const clearDraftForItem = (itemId: string) => {
    setQuantityDrafts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const commitDraftQuantity = (itemId: string) => {
    const item = itemMap.get(itemId);
    if (!item) return;
    const raw = quantityDrafts[itemId];
    if (raw === undefined) return;

    const parsed = Number.parseInt(raw, 10);
    const normalized = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    clearDraftForItem(itemId);

    if (normalized !== item.quantityRequested) {
      onUpdateQuantity(itemId, normalized);
    }
  };

  return (
    <div className="px-4">
      {categories.map((category) => (
        <section key={category} className="mb-4 last:mb-0">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2 pt-2 first:pt-0">
            {category}
          </h3>
          <ul className="divide-y divide-slate-100">
            {groupedItems[category].map((item, indexInCategory) => {
              const isPending = item._id.startsWith("temp-");
              return (
                <li
                  key={item._id}
                  className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 min-h-10"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 shrink-0 text-base font-medium text-slate-500 tabular-nums">
                      {getItemNumber(category, indexInCategory)}.
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-medium leading-5 text-slate-900 whitespace-normal break-words">
                      {item.nameSnapshot}
                    </span>
                    <div className="flex items-center shrink-0">
                      {isPending ? (
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving…
                        </span>
                      ) : !readonly ? (
                        <div
                          className="flex items-center rounded-md border border-slate-200 bg-slate-50/80"
                          role="group"
                          aria-label={`Quantity: ${item.quantityRequested} ${item.unit}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(
                                item._id,
                                Math.max(1, getCurrentQuantity(item) - 1)
                              )
                            }
                            disabled={isLoading || getCurrentQuantity(item) <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-l-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label={`Decrease ${item.nameSnapshot}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex items-center gap-1 px-1">
                            <input
                              type="number"
                              min={1}
                              inputMode="numeric"
                              value={quantityDrafts[item._id] ?? `${item.quantityRequested}`}
                              onChange={(e) => setDraftForItem(item._id, e.target.value)}
                              onBlur={() => commitDraftQuantity(item._id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.currentTarget as HTMLInputElement).blur();
                                }
                              }}
                              style={{
                                width: `${Math.max(
                                  1,
                                  (quantityDrafts[item._id] ?? `${item.quantityRequested}`).length
                                )}ch`,
                              }}
                              className="h-6 min-w-2 border-0 bg-transparent p-0 text-center text-sm font-semibold text-slate-900 tabular-nums outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              aria-label={`Quantity for ${item.nameSnapshot}`}
                              disabled={isLoading}
                            />
                            <span className="text-xs font-semibold text-slate-600">
                              {item.unit}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item._id, getCurrentQuantity(item) + 1)
                            }
                            disabled={isLoading}
                            className="flex h-7 w-7 items-center justify-center rounded-r-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                            aria-label={`Increase ${item.nameSnapshot}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">
                          {item.quantityRequested} {item.unit}
                        </span>
                      )}
                    </div>
                    {!readonly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item._id)}
                        disabled={isLoading}
                        className="h-7 w-7 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md"
                        aria-label={`Remove ${item.nameSnapshot}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
