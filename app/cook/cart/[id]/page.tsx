"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IngredientPicker } from "@/components/ui/ingredient-picker";
import { CartItemsList, type CartItem } from "@/components/ui/cart-items-list";
import { AddMissingIngredientForm } from "@/components/ui/add-missing-ingredient-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Plus, ShoppingCart, X, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  WeekMenuSummary,
  type WeekMenuDay,
} from "@/components/cook/week-menu-summary";
import type { IngredientRecord } from "@/lib/interfaces/ingredient";

type CartStatus = "draft" | "submitted" | "finalized";

export default function ContinueCartPage() {
  const router = useRouter();
  const params = useParams();
  const cartIdParam = params?.id as string | undefined;

  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartStatus, setCartStatus] = useState<CartStatus | null>(null);
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
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddMissing, setShowAddMissing] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = cartStatus === "draft";

  // Load cart by ID and week plan
  useEffect(() => {
    if (!cartIdParam) return;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const { user } = await meRes.json();
        setUserId(user.id);

        const cartRes = await fetch(`/api/carts/${cartIdParam}`);
        if (!cartRes.ok) {
          if (cartRes.status === 404) {
            setError("Cart not found.");
          } else {
            setError("Failed to load cart.");
          }
          setIsLoading(false);
          return;
        }

        const { cart, items } = await cartRes.json();
        setCartStatus(cart.status);
        setWeekPlanId(cart.weekPlanId);

        const mappedItems: CartItem[] = (items || []).map((it: {
          _id: string;
          ingredientId: string;
          nameSnapshot: string;
          categorySnapshot: string;
          storeIdSnapshot: string | null;
          quantityRequested: number;
          unit: string;
        }) => ({
          _id: it._id,
          ingredientId: it.ingredientId,
          nameSnapshot: it.nameSnapshot,
          categorySnapshot: it.categorySnapshot,
          storeIdSnapshot: it.storeIdSnapshot ?? null,
          quantityRequested: it.quantityRequested,
          unit: it.unit,
        }));
        setCartItems(mappedItems);

        if (cart.weekPlanId) {
          const weekRes = await fetch(`/api/week-plans/${cart.weekPlanId}`);
          if (weekRes.ok) {
            const { weekPlan: wp } = await weekRes.json();
            setWeekPlan(wp);
          }
        }

        if (cart.status === "draft") {
          const ingredientsRes = await fetch("/api/ingredients/search?q=");
          if (ingredientsRes.ok) {
            const { ingredients: fetchedIngredients } = await ingredientsRes.json();
            setIngredients(fetchedIngredients);
          }
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load cart");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [cartIdParam, router]);

  const handleSelectIngredient = (ingredient: IngredientRecord) => {
    setSelectedIngredient(ingredient);
    setUnit(ingredient.defaultUnit);
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!selectedIngredient || !cartIdParam) return;

    try {
      setIsSubmitting(true);
      const addItemRes = await fetch(`/api/carts/${cartIdParam}/items`, {
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

      setCartItems((prev) => [
        ...prev,
        {
          _id: itemId,
          ingredientId: selectedIngredient._id!.toString(),
          nameSnapshot: selectedIngredient.name,
          categorySnapshot: selectedIngredient.category,
          storeIdSnapshot: selectedIngredient.storeId?.toString() ?? null,
          quantityRequested: quantity,
          unit,
        },
      ]);

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
    if (!cartIdParam) return;
    try {
      const res = await fetch(`/api/carts/${cartIdParam}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (!res.ok) throw new Error("Failed to update quantity");
      setCartItems((prev) =>
        prev.map((item) =>
          item._id === itemId ? { ...item, quantityRequested: newQuantity } : item
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!cartIdParam) return;
    try {
      const res = await fetch(`/api/carts/${cartIdParam}/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove item");
      setCartItems((prev) => prev.filter((item) => item._id !== itemId));
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
      setIngredients((prev) => [...prev, ingredient]);
      setShowAddMissing(false);
      handleSelectIngredient(ingredient);
    } catch (err) {
      throw err;
    }
  };

  const handleSubmitCart = async () => {
    if (!cartIdParam) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/carts/${cartIdParam}/submit`, {
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

  if (error && !cartStatus) {
    return (
      <main className="min-h-screen bg-white px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <p className="text-base text-red-700">{error}</p>
              <Button asChild variant="outline" size="lg" className="mt-4 h-14">
                <Link href="/cook">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Read-only view for submitted/finalized carts
  if (!isDraft) {
    return (
      <main className="flex min-h-screen flex-col bg-white text-slate-900">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col min-h-0 px-4 py-4 sm:py-6">
          <div className="shrink-0 mb-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cook" aria-label="Back to dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Cart — {cartStatus}
              </h1>
              <p className="text-base text-slate-600">
                This cart has been {cartStatus}. View only.
              </p>
            </div>
          </div>

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

          <div className="flex-1 overflow-y-auto">
            <CartItemsList
              items={cartItems}
              onUpdateQuantity={() => {}}
              onRemoveItem={() => {}}
              readonly
            />
          </div>

          <div className="shrink-0 border-t border-slate-200 pt-4 mt-4">
            <Button asChild variant="outline" size="lg" className="w-full h-12">
              <Link href="/cook">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Draft: full continue-building UI (same as new cart)
  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col min-h-0 px-4 py-4 sm:py-6">
        <div className="shrink-0 mb-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cook" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Continue Cart
            </h1>
            <p className="text-base text-slate-700">
              Pick up where you left off
            </p>
          </div>
        </div>

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

        {error && (
          <div className="shrink-0 mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

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

      {selectedIngredient && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-2xl"
          role="dialog"
          aria-label="Add to cart"
        >
          <div className="mx-auto max-w-4xl px-4 pt-4 pb-6 sm:pb-8">
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
