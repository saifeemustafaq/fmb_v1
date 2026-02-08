"use client";

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
  const groupedItems = items.reduce((acc, item) => {
    const category = item.categorySnapshot;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);
  const categories = Object.keys(groupedItems).sort();

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
                  className="flex items-center gap-2 py-2 first:pt-0 last:pb-0 min-h-10"
                >
                  <span className="w-7 shrink-0 text-base font-medium text-slate-500 tabular-nums">
                    {getItemNumber(category, indexInCategory)}.
                  </span>
                  <span className="flex-1 min-w-0 text-base font-medium text-slate-900 truncate">
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
                              Math.max(1, item.quantityRequested - 1)
                            )
                          }
                          disabled={isLoading || item.quantityRequested <= 1}
                          className="flex h-7 w-7 items-center justify-center rounded-l-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent"
                          aria-label={`Decrease ${item.nameSnapshot}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-9 px-1 py-0.5 text-center text-sm font-semibold text-slate-900 tabular-nums">
                          {item.quantityRequested} {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item._id, item.quantityRequested + 1)
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
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
