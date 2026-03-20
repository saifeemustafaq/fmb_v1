"use client";

/**
 * Minimal display shape for a cart line item.
 * Both combined-cart and per-cart API responses can be mapped to this.
 */
export type CartItemDisplay = {
  nameSnapshot: string;
  quantityRequested: number;
  unit: string;
  categorySnapshot?: string;
};

type CartItemsListProps = {
  items: CartItemDisplay[];
  emptyMessage?: string;
  /** Optional key prefix when items lack unique ids (e.g. combined list uses ingredientId+unit) */
  itemKeyPrefix?: string;
  /** Show "Item | Qty" header row (default true) */
  showHeader?: boolean;
};

export function CartItemsList({
  items,
  emptyMessage = "No items.",
  itemKeyPrefix = "item",
  showHeader = true,
}: CartItemsListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }
  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex justify-between border-b border-slate-200 pb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span>Item</span>
          <span>Qty</span>
        </div>
      )}
      <ul className="mt-2 space-y-3">
        {items.map((item, i) => (
          <li
            key={`${itemKeyPrefix}-${item.nameSnapshot}-${item.unit}-${i}`}
            className="flex flex-col gap-0.5"
          >
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-800">{item.nameSnapshot}</span>
              <span className="text-slate-600">
                {item.quantityRequested} {item.unit}
              </span>
            </div>
            {item.categorySnapshot && (
              <div className="text-xs text-slate-500">
                ({item.categorySnapshot})
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
