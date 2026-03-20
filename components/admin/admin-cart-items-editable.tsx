"use client";

import { Minus, Plus } from "lucide-react";

export type AdminCartItemEditable = {
  _id: string;
  nameSnapshot: string;
  quantityRequested: number;
  unit: string;
  categorySnapshot?: string;
  /** Original quantity when the cart was loaded; never changed by edits */
  originalQuantity: number;
};

type AdminCartItemsEditableProps = {
  items: AdminCartItemEditable[];
  emptyMessage?: string;
  itemKeyPrefix?: string;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  isUpdating?: boolean;
};

export function AdminCartItemsEditable({
  items,
  emptyMessage = "No items.",
  itemKeyPrefix = "item",
  onQuantityChange,
  isUpdating = false,
}: AdminCartItemsEditableProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  const hasAnyModification = items.some(
    (it) => it.quantityRequested !== it.originalQuantity
  );

  return (
    <div className="w-full">
      <div
        className={`grid gap-2 border-b border-slate-200 pb-1 text-xs font-medium uppercase tracking-wide text-slate-500 ${hasAnyModification ? "grid-cols-[1fr_auto_140px]" : "grid-cols-[1fr_auto]"}`}
      >
        <span>Item</span>
        <span>Qty</span>
        {hasAnyModification && (
          <span className="text-slate-400">Original → Modified</span>
        )}
      </div>
      <ul className="mt-2 space-y-3">
        {items.map((item, i) => {
          const isModified = item.quantityRequested !== item.originalQuantity;
          const isDeleted = item.quantityRequested === 0;
          return (
            <li
              key={`${itemKeyPrefix}-${item._id}-${i}`}
              className={`flex flex-col gap-0.5 ${isDeleted ? "opacity-80" : ""}`}
            >
              <div
                className={`grid min-h-9 items-center gap-2 ${hasAnyModification ? "grid-cols-[1fr_auto_140px]" : "grid-cols-[1fr_auto]"}`}
              >
                <div className="min-w-0">
                  <span
                    className={`block text-sm font-medium text-slate-800 ${isDeleted ? "line-through text-slate-500" : ""}`}
                  >
                    {item.nameSnapshot}
                  </span>
                  {item.categorySnapshot && (
                    <span className="text-xs text-slate-500">
                      ({item.categorySnapshot})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  <div
                    className="flex items-center rounded-md border border-slate-200 bg-slate-50/80"
                    role="group"
                    aria-label={`Quantity: ${item.quantityRequested} ${item.unit}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onQuantityChange(
                          item._id,
                          Math.max(0, item.quantityRequested - 1)
                        )
                      }
                      disabled={isUpdating}
                      className="flex h-8 w-8 items-center justify-center rounded-l-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 disabled:opacity-50"
                      aria-label={`Decrease ${item.nameSnapshot}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span
                      className={`min-w-[3rem] px-2 py-1 text-center text-sm font-semibold tabular-nums ${isDeleted ? "line-through text-slate-500" : "text-slate-800"}`}
                    >
                      {item.quantityRequested} {item.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onQuantityChange(item._id, item.quantityRequested + 1)
                      }
                      disabled={isUpdating}
                      className="flex h-8 w-8 items-center justify-center rounded-r-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 disabled:opacity-50"
                      aria-label={`Increase ${item.nameSnapshot}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {hasAnyModification && (
                  <div className="text-xs text-slate-400">
                    {isModified ? (
                      <span>
                        <span
                          className={`tabular-nums ${isDeleted ? "line-through" : ""}`}
                        >
                          {item.originalQuantity}
                        </span>
                        {" → "}
                        <span className="tabular-nums">
                          {item.quantityRequested}
                        </span>
                      </span>
                    ) : (
                      <span className="tabular-nums">
                        {item.originalQuantity}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
