"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CartItemsList, type CartItem } from "@/components/ui/cart-items-list";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import {
  WeekMenuSummary,
  type WeekMenuDay,
} from "@/components/cook/week-menu-summary";
import { DraftCartBuilder, type DraftWeekPlan } from "@/components/cook/draft-cart-builder";
import type { IngredientRecord } from "@/lib/interfaces/ingredient";

type CartStatus = "draft" | "submitted" | "finalized";

export function ContinueCartPageContent({
  allowSubmittedEdit = false,
}: {
  allowSubmittedEdit?: boolean;
}) {
  const router = useRouter();
  const params = useParams();
  const cartIdParam = params?.id as string | undefined;

  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartStatus, setCartStatus] = useState<CartStatus | null>(null);
  const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
  const [weekPlan, setWeekPlan] = useState<DraftWeekPlan | null>(null);
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
  const isEditableStatus = isDraft || (allowSubmittedEdit && cartStatus === "submitted");

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
    const ingredientId = ingredient._id?.toString();
    const existingTotal =
      ingredientId == null
        ? 0
        : cartItems.reduce(
            (sum, item) =>
              item.ingredientId === ingredientId
                ? sum + item.quantityRequested
                : sum,
            0
          );
    setSelectedIngredient(ingredient);
    setUnit(ingredient.defaultUnit);
    setQuantity(existingTotal);
  };

  const handleAddToCart = async () => {
    if (!selectedIngredient || !cartIdParam) return;

    const ingredientId = selectedIngredient._id!.toString();
    const unitToAdd = unit;
    const quantityToSet = quantity;
    const existingItem = cartItems.find(
      (item) => item.ingredientId === ingredientId && item.unit === unitToAdd
    );

    if (existingItem) {
      if (quantityToSet <= 0) {
        handleRemoveItem(existingItem._id);
      } else {
        handleUpdateQuantity(existingItem._id, quantityToSet);
      }
      setSelectedIngredient(null);
      setQuantity(0);
      setUnit("");
      return;
    }

    if (quantityToSet <= 0) {
      setSelectedIngredient(null);
      setUnit("");
      return;
    }

    try {
      setIsSubmitting(true);
      const addItemRes = await fetch(`/api/carts/${cartIdParam}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId,
          quantity: quantityToSet,
          unit: unitToAdd,
        }),
      });

      if (!addItemRes.ok) throw new Error("Failed to add item");
      const { itemId } = await addItemRes.json();

      setCartItems((prev) => [
        ...prev,
        {
          _id: itemId,
          ingredientId,
          nameSnapshot: selectedIngredient.name,
          categorySnapshot: selectedIngredient.category,
          storeIdSnapshot: selectedIngredient.storeId?.toString() ?? null,
          quantityRequested: quantityToSet,
          unit: unitToAdd,
        },
      ]);

      setSelectedIngredient(null);
      setQuantity(0);
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

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (!cartIdParam) return;

    let previousQuantity = 1;
    setCartItems((prev) =>
      prev.map((item) => {
        if (item._id === itemId) {
          previousQuantity = item.quantityRequested;
          return { ...item, quantityRequested: newQuantity };
        }
        return item;
      })
    );

    (async () => {
      try {
        const res = await fetch(`/api/carts/${cartIdParam}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: newQuantity }),
        });
        if (!res.ok) throw new Error("Failed to update quantity");
      } catch (err) {
        console.error(err);
        setError("Failed to update quantity");
        setCartItems((prev) =>
          prev.map((item) =>
            item._id === itemId
              ? { ...item, quantityRequested: previousQuantity }
              : item
          )
        );
      }
    })();
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
      router.push("/cook?submitted=1");
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
          <Card className="border-red-200 bg-red-50" role="alert">
            <CardContent className="py-8 text-center">
              <p className="text-base text-red-700">{error}</p>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="mt-4 min-h-[48px] h-14 text-base focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Link href="/cook">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Read-only view for submitted/finalized carts unless explicitly in edit mode for submitted
  if (!isEditableStatus) {
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
                {weekPlan
                  ? weekPlan.name?.trim()
                    ? `Cart — ${weekPlan.name}`
                    : weekPlan.days.length === 1
                    ? "Cart — Single-day plan"
                    : weekPlan.weekStartDate
                      ? `Cart — Week of ${new Date(weekPlan.weekStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : "Cart"
                  : "Cart"}
                {" — "}
                {cartStatus}
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

  // Editable view: draft continue or submitted edit mode
  const title = weekPlan
    ? weekPlan.name?.trim()
      ? `Cart — ${weekPlan.name}`
      : weekPlan.days.length === 1
        ? "Cart — Single-day plan"
        : weekPlan.weekStartDate
          ? `Cart — Week of ${new Date(weekPlan.weekStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Continue Cart"
    : "Continue Cart";

  return (
    <DraftCartBuilder
      title={title}
      subtitle={
        isDraft
          ? "Pick up where you left off"
          : "Update your submitted cart before admin finalizes it"
      }
      weekPlan={weekPlan}
      userId={userId}
      error={error}
      ingredients={ingredients}
      cartItems={cartItems}
      selectedIngredient={selectedIngredient}
      quantity={quantity}
      unit={unit}
      isSubmitting={isSubmitting}
      showCartSheet={showCartSheet}
      showAddMissing={showAddMissing}
      submitButtonLabel={isDraft ? "Submit Cart for Review" : "Done Editing"}
      submitDisabled={isSubmitting || cartItems.some((i) => i._id.startsWith("temp-"))}
      showSavingHint={cartItems.some((i) => i._id.startsWith("temp-"))}
      onSelectIngredient={handleSelectIngredient}
      onOpenCart={() => setShowCartSheet(true)}
      onOpenAddMissing={() => setShowAddMissing(true)}
      onCloseAddBar={handleCloseAddBar}
      onSetShowCartSheet={setShowCartSheet}
      onSetShowAddMissing={setShowAddMissing}
      onDecreaseQuantity={() => setQuantity((q) => Math.max(0, q - 1))}
      onIncreaseQuantity={() => setQuantity((q) => q + 1)}
      onQuantityInputChange={(value) => {
        const v = parseInt(value, 10);
        if (!Number.isNaN(v) && v >= 0) setQuantity(v);
        else if (value === "") setQuantity(0);
      }}
      onQuantityBlur={() => setQuantity((q) => (q < 0 ? 0 : q))}
      onQuickAdd={(n) => setQuantity((q) => q + n)}
      onResetQuantity={() => setQuantity(0)}
      onAddToCart={handleAddToCart}
      onUpdateQuantity={handleUpdateQuantity}
      onRemoveItem={handleRemoveItem}
      onSubmitCart={
        isDraft
          ? handleSubmitCart
          : async () => {
              router.push(`/cook/cart/${cartIdParam}`);
            }
      }
      onAddMissingIngredient={handleAddMissingIngredient}
    />
  );
}

export default function ContinueCartPage() {
  return <ContinueCartPageContent />;
}
