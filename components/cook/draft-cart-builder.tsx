"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IngredientPicker } from "@/components/ui/ingredient-picker";
import { CartItemsList, type CartItem } from "@/components/ui/cart-items-list";
import { AddMissingIngredientForm } from "@/components/ui/add-missing-ingredient-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { WeekMenuSummary, type WeekMenuDay } from "@/components/cook/week-menu-summary";
import { Home, Plus, ShoppingCart, X } from "lucide-react";
import type { IngredientRecord } from "@/lib/interfaces/ingredient";

export type DraftWeekPlan = {
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
};

type MissingIngredientInput = {
  name: string;
  category: string;
  unit: string;
  notes?: string;
};

type DraftCartBuilderProps = {
  title: string;
  subtitle: string;
  weekPlan: DraftWeekPlan | null;
  userId: string | null;
  error: string | null;
  ingredients: IngredientRecord[];
  cartItems: CartItem[];
  selectedIngredient: IngredientRecord | null;
  quantity: number;
  unit: string;
  isSubmitting: boolean;
  showCartSheet: boolean;
  showAddMissing: boolean;
  submitButtonLabel: string;
  submitDisabled: boolean;
  showSavingHint?: boolean;
  showEditFooter?: boolean;
  onSelectIngredient: (ingredient: IngredientRecord) => void;
  onOpenCart: () => void;
  onOpenAddMissing: () => void;
  onCloseAddBar: () => void;
  onSetShowCartSheet: (open: boolean) => void;
  onSetShowAddMissing: (open: boolean) => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  onQuantityInputChange: (value: string) => void;
  onQuantityBlur: () => void;
  onQuickAdd: (amount: number) => void;
  onResetQuantity: () => void;
  onAddToCart: () => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onSubmitCart: () => Promise<void>;
  onAddMissingIngredient: (data: MissingIngredientInput) => Promise<void>;
};

export function DraftCartBuilder({
  title,
  subtitle,
  weekPlan,
  userId,
  error,
  ingredients,
  cartItems,
  selectedIngredient,
  quantity,
  unit,
  isSubmitting,
  showCartSheet,
  showAddMissing,
  submitButtonLabel,
  submitDisabled,
  showSavingHint = false,
  showEditFooter = false,
  onSelectIngredient,
  onOpenCart,
  onOpenAddMissing,
  onCloseAddBar,
  onSetShowCartSheet,
  onSetShowAddMissing,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onQuantityInputChange,
  onQuantityBlur,
  onQuickAdd,
  onResetQuantity,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitCart,
  onAddMissingIngredient,
}: DraftCartBuilderProps) {
  const cartQuantityByIngredientId = cartItems.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.ingredientId] = (acc[item.ingredientId] ?? 0) + item.quantityRequested;
      return acc;
    },
    {}
  );

  const myDays: WeekMenuDay[] =
    weekPlan && userId
      ? weekPlan.days
          .filter((day) => {
            const effective = day.assignedCookId ?? weekPlan.assignedCookId;
            return effective === userId;
          })
          .map((d) => ({
            date: d.date,
            dayType: d.dayType ?? "thali",
            headcount: d.headcount ?? 0,
            menuItems: d.menuItems ?? [],
            assignedCookId: d.assignedCookId,
          }))
      : [];

  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-4 py-4 sm:py-6">
        <div className="shrink-0 mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              <button
                type="button"
                onClick={onOpenAddMissing}
                className="self-start sm:self-center flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
                aria-label="Add missing ingredient"
              >
                <Plus className="h-5 w-5 shrink-0" />
              </button>
            </div>
            <p className="mt-2 text-base text-slate-700">{subtitle}</p>
          </div>
        </div>

        {myDays.length > 0 && (
          <div className="shrink-0 mb-4">
            <WeekMenuSummary days={myDays} collapsible defaultOpen compact={false} />
          </div>
        )}

        {error && (
          <div className="shrink-0 mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div
          className={
            selectedIngredient
              ? "flex min-h-0 flex-1 flex-col pb-52"
              : "flex min-h-0 flex-1 flex-col pb-24"
          }
        >
          <IngredientPicker
            ingredients={ingredients}
            onSelect={onSelectIngredient}
            onAddMissing={onOpenAddMissing}
            groupByCategory={false}
            placeholder="Search ingredients..."
            fillHeight
            showAddButton={false}
            cartQuantityByIngredientId={cartQuantityByIngredientId}
          />
        </div>
      </div>

      {!selectedIngredient && showEditFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onOpenCart}
              className="h-12 w-full gap-2 text-base bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background"
              aria-label={`View cart (${cartItems.length} ${cartItems.length === 1 ? "item" : "items"})`}
            >
              <ShoppingCart className="h-5 w-5 shrink-0" />
              View cart
            </Button>
            <Button variant="outline" size="default" asChild className="h-12 w-full gap-2 text-base bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background">
              <Link href="/cook" aria-label="Home">
                <Home className="h-5 w-5 shrink-0" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      )}
      {!selectedIngredient && !showEditFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto w-full max-w-4xl px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="default"
                onClick={onOpenCart}
                className="h-11 text-sm font-medium bg-primary-foreground text-primary hover:bg-primary-foreground/90 hover:text-primary"
                aria-label={`View cart (${cartItems.length} ${cartItems.length === 1 ? "item" : "items"})`}
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                View cart
                <span className="ml-1 text-xs opacity-80">({cartItems.length})</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onOpenAddMissing}
                className="h-11 text-sm font-medium"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add missing
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedIngredient && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          role="dialog"
          aria-label="Add to cart"
        >
          <div className="mx-auto max-w-4xl px-4 pt-4 pb-6 sm:pb-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">
                {selectedIngredient.name}
              </h3>
              <button
                type="button"
                onClick={onCloseAddBar}
                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onDecreaseQuantity}
                  disabled={quantity <= 0}
                  className="h-10 w-full rounded-lg border-slate-400 hover:border-slate-500"
                  aria-label="Decrease by 1"
                >
                  −
                </Button>
                <div className="flex min-w-0 items-center justify-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => onQuantityInputChange(e.target.value)}
                    onBlur={onQuantityBlur}
                    className="h-10 w-full text-center text-base font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Quantity"
                  />
                  <span className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {unit}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={onIncreaseQuantity}
                  className="h-10 w-full rounded-lg border-slate-400 hover:border-slate-500"
                  aria-label="Increase by 1"
                >
                  +
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-full text-xs font-medium text-slate-500 sm:w-auto">Quick add:</span>
                {[1, 2, 5, 10, 20].map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickAdd(n)}
                    className="h-8 min-w-9 rounded-md text-sm font-medium"
                  >
                    +{n}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onResetQuantity}
                  className="h-8 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Reset
                </Button>
              </div>
            </div>

            <Button
              onClick={onAddToCart}
              disabled={isSubmitting}
              size="lg"
              className="mt-4 h-12 w-full rounded-xl text-base font-semibold"
              aria-label={isSubmitting ? "Adding to cart" : "Add to cart"}
            >
              {isSubmitting ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={showCartSheet} onOpenChange={onSetShowCartSheet}>
        <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-left">Your cart</SheetTitle>
          </SheetHeader>
          <div className="mt-4 -mx-6 flex-1 overflow-y-auto px-6">
            <CartItemsList items={cartItems} onUpdateQuantity={onUpdateQuantity} onRemoveItem={onRemoveItem} />
          </div>
          <div className="shrink-0 border-t bg-white pt-4 pb-8 px-4">
            {showSavingHint && (
              <p className="mb-2 text-sm text-slate-500">
                Saving items... You can submit when all items are saved.
              </p>
            )}
            <Button
              onClick={async () => {
                await onSubmitCart();
                onSetShowCartSheet(false);
              }}
              disabled={submitDisabled}
              size="lg"
              className="h-14 w-full text-base font-semibold"
              aria-label={isSubmitting ? "Submitting cart" : "Submit cart for review"}
            >
              {isSubmitting ? "Submitting..." : submitButtonLabel}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showAddMissing} onOpenChange={onSetShowAddMissing}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" showCloseButton={false}>
          <div className="px-1 pt-2">
            <AddMissingIngredientForm
              onSubmit={onAddMissingIngredient}
              onCancel={() => onSetShowAddMissing(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
