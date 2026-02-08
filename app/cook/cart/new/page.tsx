"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IngredientPicker } from "@/components/ui/ingredient-picker";
import { CartItemsList, type CartItem } from "@/components/ui/cart-items-list";
import { AddMissingIngredientForm } from "@/components/ui/add-missing-ingredient-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Plus, ShoppingCart, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  WeekMenuSummary,
  type WeekMenuDay,
} from "@/components/cook/week-menu-summary";
import type { IngredientRecord } from "@/lib/interfaces/ingredient";

export default function NewCartPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [cartId, setCartId] = useState<string | null>(null);
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
  const [weekPlan, setWeekPlan] = useState<{
    _id: string;
    assignedCookId: string;
    days: Array<{
      date: string;
      dayType?: string;
      headcount?: number;
      menuItems?: string[];
      assignedCookId: string | null;
    }>;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddMissing, setShowAddMissing] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's ingredients and week plan
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const { user } = await meRes.json();

        // Get assigned week plan
        const weekRes = await fetch(`/api/week-plans/cook/${user.id}`);
        if (!weekRes.ok) throw new Error("Failed to fetch week plan");
        const { weekPlan } = await weekRes.json();

        if (!weekPlan) {
          setError("No week plan assigned. Please contact admin.");
          setIsLoading(false);
          return;
        }

        setWeekPlanId(weekPlan._id);
        setWeekPlan(weekPlan);
        setUserId(user.id);

        // Search for ingredients (empty query returns all)
        const ingredientsRes = await fetch("/api/ingredients/search?q=");
        if (!ingredientsRes.ok) throw new Error("Failed to fetch ingredients");
        const { ingredients: fetchedIngredients } = await ingredientsRes.json();
        setIngredients(fetchedIngredients);

        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
        setIsLoading(false);
      }
    };

    init();
  }, [router]);

  const handleSelectIngredient = (ingredient: IngredientRecord) => {
    setSelectedIngredient(ingredient);
    setUnit(ingredient.defaultUnit);
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!selectedIngredient || !weekPlanId) return;

    try {
      setIsSubmitting(true);

      // Create cart if needed
      let currentCartId = cartId;
      if (!currentCartId) {
        const createCartRes = await fetch("/api/carts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekPlanId }),
        });

        if (!createCartRes.ok) throw new Error("Failed to create cart");
        const { cartId: newCartId } = await createCartRes.json();
        currentCartId = newCartId;
        setCartId(newCartId);
      }

      // Add item to cart
      const addItemRes = await fetch(`/api/carts/${currentCartId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: selectedIngredient._id,
          quantity,
          unit,
        }),
      });

      if (!addItemRes.ok) throw new Error("Failed to add item");
      const { itemId } = await addItemRes.json();

      // Add to local state
      setCartItems([
        ...cartItems,
        {
          _id: itemId,
          ingredientId: selectedIngredient._id!.toString(),
          nameSnapshot: selectedIngredient.name,
          categorySnapshot: selectedIngredient.category,
          storeIdSnapshot: selectedIngredient.storeId?.toString() || null,
          quantityRequested: quantity,
          unit,
        },
      ]);

      // Reset selection and close bottom bar
      setSelectedIngredient(null);
      setQuantity(1);
      setUnit("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAddBar = () => {
    setSelectedIngredient(null);
    setQuantity(1);
    setUnit("");
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      const res = await fetch(`/api/carts/${cartId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (!res.ok) throw new Error("Failed to update quantity");

      setCartItems(
        cartItems.map((item) =>
          item._id === itemId ? { ...item, quantityRequested: newQuantity } : item
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/carts/${cartId}/items/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove item");

      setCartItems(cartItems.filter((item) => item._id !== itemId));
    } catch (err) {
      console.error(err);
      setError("Failed to remove item");
    }
  };

  const handleAddMissingIngredient = async (data: {
    name: string;
    category: string;
    unit: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch("/api/ingredients/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          category: data.category,
          defaultUnit: data.unit,
          notes: data.notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to add ingredient");
      const { ingredient } = await res.json();

      // Add to ingredients list
      setIngredients([...ingredients, ingredient]);
      setShowAddMissing(false);

      // Auto-select the new ingredient
      handleSelectIngredient(ingredient);
    } catch (err) {
      throw err;
    }
  };

  const handleSubmitCart = async () => {
    if (!cartId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/carts/${cartId}/submit`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to submit cart");

      router.push("/cook");
    } catch (err) {
      console.error(err);
      setError("Failed to submit cart");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  if (error && !weekPlanId) {
    return (
      <main className="min-h-screen bg-white px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <p className="text-base text-red-700">{error}</p>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="mt-4 h-14"
              >
                <a href="/cook">Back to Dashboard</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col min-h-0 px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="shrink-0 mb-4">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Build Cart
          </h1>
          <p className="mt-2 text-base text-slate-700">
            Search and add ingredients for this week
          </p>
        </div>

        {/* This week you're cooking */}
        {weekPlan && userId && (() => {
          const defaultCookId = weekPlan.assignedCookId;
          const myDays: WeekMenuDay[] = weekPlan.days
            .filter((day) => {
              const effective = day.assignedCookId ?? defaultCookId;
              return effective === userId;
            })
            .map((d) => ({
              date: d.date,
              dayType: d.dayType ?? "thali",
              headcount: d.headcount ?? 0,
              menuItems: d.menuItems ?? [],
              assignedCookId: d.assignedCookId,
            }));
          if (myDays.length === 0) return null;
          return (
            <div className="shrink-0 mb-4">
              <WeekMenuSummary
                days={myDays}
                collapsible
                defaultOpen
                compact={false}
              />
            </div>
          );
        })()}

        {/* Error Alert */}
        {error && (
          <div className="shrink-0 mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Ingredient list – fills remaining height, scrolls */}
        <div
          className={
            selectedIngredient
              ? "flex min-h-0 flex-1 flex-col pb-52"
              : "flex min-h-0 flex-1 flex-col"
          }
        >
          <IngredientPicker
            ingredients={ingredients}
            onSelect={handleSelectIngredient}
            onAddMissing={() => setShowAddMissing(true)}
            groupByCategory={false}
            placeholder="Search ingredients..."
            fillHeight
            showAddButton={false}
          />
        </div>

        {/* Sticky footer – always visible at bottom */}
        <div className="shrink-0 border-t border-slate-200 bg-white py-3 pt-4">
          {cartItems.length > 0 && (
            <Button
              type="button"
              onClick={() => setShowCartSheet(true)}
              size="lg"
              className="mb-3 h-12 w-full text-base font-semibold"
              aria-label={`View cart (${cartItems.length} items)`}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              View cart ({cartItems.length} {cartItems.length === 1 ? "item" : "items"})
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAddMissing(true)}
            className="h-12 w-full text-base font-semibold border-2"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add missing ingredient
          </Button>
        </div>
      </div>

      {/* Bottom bar: quantity + Add to cart (no overlay – just the bar) */}
      {selectedIngredient && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-2xl"
          role="dialog"
          aria-label="Add to cart"
        >
          <div className="mx-auto max-w-4xl px-4 pt-4 pb-6 sm:pb-8">
            {/* Header: ingredient name + close */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900 truncate flex-1 min-w-0">
                {selectedIngredient.name}
              </h3>
              <button
                type="button"
                onClick={handleCloseAddBar}
                className="shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quantity: stepper + input + quick add */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="h-10 w-10 rounded-lg shrink-0"
                  aria-label="Decrease by 1"
                >
                  −
                </Button>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[140px]">
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 1) setQuantity(v);
                      else if (e.target.value === "") setQuantity(1);
                    }}
                    onBlur={() => setQuantity((q) => (q < 1 ? 1 : q))}
                    className="h-10 w-16 text-center text-base font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Quantity"
                  />
                  <span className="text-sm font-medium text-slate-600 shrink-0">{unit}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-10 w-10 rounded-lg shrink-0"
                  aria-label="Increase by 1"
                >
                  +
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500 w-full sm:w-auto">Quick add:</span>
                {[1, 2, 5, 10, 20].map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => q + n)}
                    className="h-8 min-w-9 rounded-md text-sm font-medium"
                  >
                    +{n}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(1)}
                  className="h-8 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Add to cart */}
            <Button
              onClick={handleAddToCart}
              disabled={isSubmitting}
              size="lg"
              className="mt-4 h-12 w-full text-base font-semibold rounded-xl"
              aria-label={isSubmitting ? "Adding to cart" : "Add to cart"}
            >
              {isSubmitting ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      )}

      {/* View cart sheet – full cart list + submit */}
      <Sheet open={showCartSheet} onOpenChange={setShowCartSheet}>
        <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-left">Your cart</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
            <CartItemsList
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          </div>
          <div className="pt-4 pb-8 border-t bg-white shrink-0">
            <Button
              onClick={async () => {
                await handleSubmitCart();
                setShowCartSheet(false);
              }}
              disabled={isSubmitting}
              size="lg"
              className="h-14 w-full text-base font-semibold"
              aria-label={isSubmitting ? "Submitting cart" : "Submit cart for review"}
            >
              {isSubmitting ? "Submitting..." : "Submit Cart for Review"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add missing ingredient – single form with title + X */}
      <Sheet open={showAddMissing} onOpenChange={setShowAddMissing}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" showCloseButton={false}>
          <div className="px-1 pt-2">
            <AddMissingIngredientForm
              onSubmit={handleAddMissingIngredient}
              onCancel={() => setShowAddMissing(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
