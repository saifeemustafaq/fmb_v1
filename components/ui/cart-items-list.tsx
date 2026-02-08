"use client";

import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Separator } from "./separator";

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
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.categorySnapshot;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  const categories = Object.keys(groupedItems).sort();
  const totalItems = items.length;

  if (items.length === 0) {
    return (
      <Card className="border-slate-200 bg-slate-50 py-4">
        <CardContent className="py-6 px-4 text-center">
          <p className="text-sm text-slate-600">
            Your cart is empty. Add ingredients to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Cart Summary */}
      <Card className="py-3 gap-2">
        <CardHeader className="py-0 px-4">
          <CardTitle className="text-base font-medium">
            Cart Summary
            <Badge className="ml-2 text-xs" variant="secondary">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Items by Category */}
      {categories.map((category) => (
        <Card key={category} className="py-3 gap-2">
          <CardHeader className="py-0 px-4 pb-1">
            <CardTitle className="text-sm font-medium text-slate-700">
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0 space-y-0">
            {groupedItems[category].map((item, index) => (
              <div key={item._id}>
                {index > 0 && <Separator className="my-2" />}
                <div className="space-y-1.5 py-1.5">
                  {/* Item Name */}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-900 truncate">
                      {item.nameSnapshot}
                    </h4>
                    {!readonly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item._id)}
                        disabled={isLoading}
                        className="h-8 min-w-8 shrink-0 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Remove ${item.nameSnapshot} from cart`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    {!readonly ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onUpdateQuantity(
                              item._id,
                              Math.max(1, item.quantityRequested - 1)
                            )
                          }
                          disabled={
                            isLoading || item.quantityRequested <= 1
                          }
                          className="h-8 w-8 shrink-0 p-0 text-base"
                          aria-label={`Decrease quantity of ${item.nameSnapshot}`}
                        >
                          −
                        </Button>
                        <div className="flex min-w-16 flex-col items-center">
                          <span className="text-base font-semibold text-slate-900">
                            {item.quantityRequested}
                          </span>
                          <span className="text-xs text-slate-600">
                            {item.unit}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onUpdateQuantity(
                              item._id,
                              item.quantityRequested + 1
                            )
                          }
                          disabled={isLoading}
                          className="h-8 w-8 shrink-0 p-0 text-base"
                          aria-label={`Increase quantity of ${item.nameSnapshot}`}
                        >
                          +
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-semibold text-slate-900">
                          {item.quantityRequested}
                        </span>
                        <span className="text-xs text-slate-600">
                          {item.unit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
