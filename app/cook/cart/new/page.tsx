"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CartItemsList, type CartItem } from "@/components/ui/cart-items-list";
import { Spinner } from "@/components/ui/spinner";
import { DraftCartBuilder, type DraftWeekPlan } from "@/components/cook/draft-cart-builder";
import type { IngredientRecord } from "@/lib/interfaces/ingredient";

export default function NewCartPage() {
	const router = useRouter();
	const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
	const [cartItems, setCartItems] = useState<CartItem[]>([]);
	const [selectedIngredient, setSelectedIngredient] =
		useState<IngredientRecord | null>(null);
	const [quantity, setQuantity] = useState(1);
	const [unit, setUnit] = useState("");
	const [cartId, setCartId] = useState<string | null>(null);
	const [weekPlanId, setWeekPlanId] = useState<string | null>(null);
	const [weekPlan, setWeekPlan] = useState<DraftWeekPlan | null>(null);
	const [userId, setUserId] = useState<string | null>(null);
	const [showAddMissing, setShowAddMissing] = useState(false);
	const [showCartSheet, setShowCartSheet] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const cartIdRef = useRef<string | null>(null);
	const createCartPromiseRef = useRef<Promise<string> | null>(null);

	useEffect(() => {
		cartIdRef.current = cartId;
	}, [cartId]);

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
				const ingredientsRes = await fetch(
					"/api/ingredients/search?q=",
				);
				if (!ingredientsRes.ok)
					throw new Error("Failed to fetch ingredients");
				const { ingredients: fetchedIngredients } =
					await ingredientsRes.json();
				setIngredients(fetchedIngredients);

				setIsLoading(false);
			} catch (err) {
				console.error(err);
				setError(
					err instanceof Error ? err.message : "Failed to initialize",
				);
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

	const getOrCreateCartId = async (): Promise<string> => {
		if (cartIdRef.current) return cartIdRef.current;
		if (!createCartPromiseRef.current) {
			createCartPromiseRef.current = (async () => {
				const res = await fetch("/api/carts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ weekPlanId }),
				});
				if (!res.ok) throw new Error("Failed to create cart");
				const { cartId: newId } = await res.json();
				cartIdRef.current = newId;
				setCartId(newId);
				return newId;
			})();
		}
		return createCartPromiseRef.current;
	};

	const handleAddToCart = () => {
		if (!selectedIngredient || !weekPlanId) return;

		const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const payload = {
			_id: tempId,
			ingredientId: selectedIngredient._id!.toString(),
			nameSnapshot: selectedIngredient.name,
			categorySnapshot: selectedIngredient.category,
			storeIdSnapshot: selectedIngredient.storeId?.toString() || null,
			quantityRequested: quantity,
			unit,
		};

		// Optimistic: add to UI and close add bar immediately
		setCartItems((prev) => [...prev, payload]);
		setSelectedIngredient(null);
		setQuantity(1);
		setUnit("");

		// Background: create cart (if needed) + add item, then replace temp id with real id
		(async () => {
			try {
				const currentCartId = await getOrCreateCartId();
				const addItemRes = await fetch(
					`/api/carts/${currentCartId}/items`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							ingredientId: selectedIngredient._id,
							quantity,
							unit,
						}),
					},
				);
				if (!addItemRes.ok) throw new Error("Failed to add item");
				const { itemId } = await addItemRes.json();
				setCartItems((prev) =>
					prev.map((item) =>
						item._id === tempId ? { ...item, _id: itemId } : item,
					),
				);
			} catch (err) {
				console.error(err);
				setError(err instanceof Error ? err.message : "Failed to add item");
				setCartItems((prev) => prev.filter((item) => item._id !== tempId));
			}
		})();
	};

	const handleCloseAddBar = () => {
		setSelectedIngredient(null);
		setQuantity(1);
		setUnit("");
	};

	const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
		if (itemId.startsWith("temp-")) return;
		if (!cartId) return;

		// Optimistic: update UI immediately so +/− feels instant
		setCartItems((prev) =>
			prev.map((item) =>
				item._id === itemId
					? { ...item, quantityRequested: newQuantity }
					: item,
			),
		);

		// Background: sync to API
		(async () => {
			try {
				const res = await fetch(`/api/carts/${cartId}/items/${itemId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ quantity: newQuantity }),
				});
				if (!res.ok) throw new Error("Failed to update quantity");
			} catch (err) {
				console.error(err);
				setError("Failed to update quantity");
			}
		})();
	};

	const handleRemoveItem = async (itemId: string) => {
		if (itemId.startsWith("temp-")) {
			setCartItems((prev) => prev.filter((item) => item._id !== itemId));
			return;
		}
		if (!cartId) return;
		try {
			const res = await fetch(`/api/carts/${cartId}/items/${itemId}`, {
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

		if (error && !weekPlanId) {
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

	const title = weekPlan
		? weekPlan.name?.trim()
			? `Cart — ${weekPlan.name}`
			: weekPlan.days.length === 1
				? "Cart — Single-day plan"
				: weekPlan.weekStartDate
					? `Cart — Week of ${new Date(weekPlan.weekStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
					: "Build Cart"
		: "Build Cart";

	return (
		<DraftCartBuilder
			title={title}
			subtitle="Search and add ingredients for this cart"
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
			submitButtonLabel="Submit Cart for Review"
			submitDisabled={
				isSubmitting ||
				!cartId ||
				cartItems.some((i) => i._id.startsWith("temp-"))
			}
			showSavingHint={cartItems.some((i) => i._id.startsWith("temp-"))}
			onSelectIngredient={handleSelectIngredient}
			onOpenCart={() => setShowCartSheet(true)}
			onOpenAddMissing={() => setShowAddMissing(true)}
			onCloseAddBar={handleCloseAddBar}
			onSetShowCartSheet={setShowCartSheet}
			onSetShowAddMissing={setShowAddMissing}
			onDecreaseQuantity={() => setQuantity((q) => Math.max(1, q - 1))}
			onIncreaseQuantity={() => setQuantity((q) => q + 1)}
			onQuantityInputChange={(value) => {
				const v = parseInt(value, 10);
				if (!Number.isNaN(v) && v >= 1) setQuantity(v);
				else if (value === "") setQuantity(1);
			}}
			onQuantityBlur={() => setQuantity((q) => (q < 1 ? 1 : q))}
			onQuickAdd={(n) => setQuantity((q) => q + n)}
			onResetQuantity={() => setQuantity(1)}
			onAddToCart={handleAddToCart}
			onUpdateQuantity={handleUpdateQuantity}
			onRemoveItem={handleRemoveItem}
			onSubmitCart={handleSubmitCart}
			onAddMissingIngredient={handleAddMissingIngredient}
		/>
	);
}
