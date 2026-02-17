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
	const cartItemsRef = useRef<CartItem[]>([]);

	useEffect(() => {
		cartIdRef.current = cartId;
	}, [cartId]);

	useEffect(() => {
		cartItemsRef.current = cartItems;
	}, [cartItems]);

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
		const ingredientId = ingredient._id?.toString();
		const existingTotal =
			ingredientId == null
				? 0
				: cartItems.reduce(
						(sum, item) =>
							item.ingredientId === ingredientId
								? sum + item.quantityRequested
								: sum,
						0,
				  );
		setSelectedIngredient(ingredient);
		setUnit(ingredient.defaultUnit);
		setQuantity(existingTotal);
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

		const ingredientId = selectedIngredient._id!.toString();
		const ingredientName = selectedIngredient.name;
		const ingredientCategory = selectedIngredient.category;
		const ingredientStoreId = selectedIngredient.storeId?.toString() || null;
		const quantityToSet = quantity;
		const unitToAdd = unit;
		const existingItem = cartItems.find(
			(item) => item.ingredientId === ingredientId && item.unit === unitToAdd,
		);

		if (existingItem) {
			const previousQuantity = existingItem.quantityRequested;
			setCartItems((prev) =>
				prev.map((item) =>
					item._id === existingItem._id
						? { ...item, quantityRequested: quantityToSet }
						: item,
				),
			);
			setSelectedIngredient(null);
			setQuantity(0);
			setUnit("");

			if (quantityToSet <= 0) {
				setCartItems((prev) =>
					prev.filter((item) => item._id !== existingItem._id),
				);
			}

			if (!existingItem._id.startsWith("temp-") && cartIdRef.current) {
				(async () => {
					try {
						const res =
							quantityToSet <= 0
								? await fetch(
										`/api/carts/${cartIdRef.current}/items/${existingItem._id}`,
										{ method: "DELETE" },
								  )
								: await fetch(
										`/api/carts/${cartIdRef.current}/items/${existingItem._id}`,
										{
											method: "PATCH",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({ quantity: quantityToSet }),
										},
								  );
						if (!res.ok)
							throw new Error(
								quantityToSet <= 0
									? "Failed to remove item"
									: "Failed to update quantity",
							);
					} catch (err) {
						console.error(err);
						setError(
							quantityToSet <= 0
								? "Failed to remove item"
								: "Failed to update quantity",
						);
						setCartItems((prev) => {
							if (quantityToSet <= 0) {
								return [...prev, existingItem];
							}
							return prev.map((item) =>
								item._id === existingItem._id
									? { ...item, quantityRequested: previousQuantity }
									: item,
							);
						});
					}
				})();
			}
			return;
		}

		if (quantityToSet <= 0) {
			setSelectedIngredient(null);
			setUnit("");
			return;
		}

		const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const payload = {
			_id: tempId,
			ingredientId,
			nameSnapshot: ingredientName,
			categorySnapshot: ingredientCategory,
			storeIdSnapshot: ingredientStoreId,
			quantityRequested: quantityToSet,
			unit: unitToAdd,
		};

		// Optimistic: add to UI and close add bar immediately
		setCartItems((prev) => [...prev, payload]);
		setSelectedIngredient(null);
		setQuantity(0);
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
							ingredientId,
							quantity: quantityToSet,
							unit: unitToAdd,
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

				const latestItem = cartItemsRef.current.find(
					(item) => item._id === tempId,
				);
				if (!latestItem) {
					const deleteRes = await fetch(
						`/api/carts/${currentCartId}/items/${itemId}`,
						{ method: "DELETE" },
					);
					if (!deleteRes.ok) throw new Error("Failed to remove item");
					return;
				}
				const latestQuantity = latestItem.quantityRequested;
				if (latestQuantity !== quantityToSet) {
					const updateRes = await fetch(
						`/api/carts/${currentCartId}/items/${itemId}`,
						{
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ quantity: latestQuantity }),
						},
					);
					if (!updateRes.ok) throw new Error("Failed to update quantity");
				}
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
			onSubmitCart={handleSubmitCart}
			onAddMissingIngredient={handleAddMissingIngredient}
		/>
	);
}
