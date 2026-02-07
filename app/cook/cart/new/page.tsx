"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ObjectId } from "bson";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IngredientPicker } from "@/components/ui/ingredient-picker";
import { CartItemsList, type CartItem } from "@/components/ui/cart-items-list";
import { AddMissingIngredientForm } from "@/components/ui/add-missing-ingredient-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
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
  const [showAddMissing, setShowAddMissing] = useState(false);
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

      // Reset selection
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
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Build Cart</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search and add ingredients for this week
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Ingredient Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Ingredients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <IngredientPicker
                ingredients={ingredients}
                onSelect={handleSelectIngredient}
                onAddMissing={() => setShowAddMissing(true)}
                groupByCategory
                placeholder="Search ingredients..."
              />

              {/* Selected Ingredient + Quantity */}
              {selectedIngredient && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Selected:
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {selectedIngredient.name}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-12 w-12 text-xl"
                    >
                      −
                    </Button>
                    <div className="flex min-w-[100px] flex-col items-center">
                      <span className="text-2xl font-semibold text-slate-900">
                        {quantity}
                      </span>
                      <span className="text-sm text-slate-600">{unit}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-12 w-12 text-xl"
                    >
                      +
                    </Button>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    disabled={isSubmitting}
                    size="lg"
                    className="h-14 w-full text-base font-medium"
                  >
                    {isSubmitting ? "Adding..." : "Add to Cart"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart Items List */}
          <CartItemsList
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />

          {/* Submit Cart Button */}
          {cartItems.length > 0 && (
            <Button
              onClick={handleSubmitCart}
              disabled={isSubmitting}
              size="lg"
              className="h-16 w-full text-lg font-semibold"
            >
              {isSubmitting ? "Submitting..." : "Submit Cart for Review"}
            </Button>
          )}
        </div>
      </div>

      {/* Add Missing Ingredient Sheet */}
      <Sheet open={showAddMissing} onOpenChange={setShowAddMissing}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Missing Ingredient</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
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
