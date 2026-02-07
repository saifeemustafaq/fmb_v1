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
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="py-12 text-center">
          <p className="text-base text-slate-600">
            Your cart is empty. Add ingredients to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cart Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Cart Summary
            <Badge className="ml-3 text-sm" variant="secondary">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Items by Category */}
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedItems[category].map((item, index) => (
              <div key={item._id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="space-y-3">
                  {/* Item Name */}
                  <div className="flex items-start justify-between">
                    <h4 className="text-base font-medium text-slate-900">
                      {item.nameSnapshot}
                    </h4>
                    {!readonly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item._id)}
                        disabled={isLoading}
                        className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    {!readonly ? (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() =>
                            onUpdateQuantity(
                              item._id,
                              Math.max(1, item.quantityRequested - 1)
                            )
                          }
                          disabled={
                            isLoading || item.quantityRequested <= 1
                          }
                          className="h-12 w-12 text-xl"
                        >
                          −
                        </Button>
                        <div className="flex min-w-[100px] flex-col items-center">
                          <span className="text-2xl font-semibold text-slate-900">
                            {item.quantityRequested}
                          </span>
                          <span className="text-sm text-slate-600">
                            {item.unit}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() =>
                            onUpdateQuantity(
                              item._id,
                              item.quantityRequested + 1
                            )
                          }
                          disabled={isLoading}
                          className="h-12 w-12 text-xl"
                        >
                          +
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-slate-900">
                          {item.quantityRequested}
                        </span>
                        <span className="text-base text-slate-600">
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
