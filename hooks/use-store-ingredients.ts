"use client";

import { useEffect, useState } from "react";

export type StoreIngredientRow = {
  _id: string;
  name: string;
  category: string;
  storeId: string | null;
  storeName: string | null;
};

type ApiIngredient = {
  _id: string;
  name: string;
  category: string;
  storeId?: string | null;
  storeName?: string | null;
};

function parseIngredients(data: { ingredients?: ApiIngredient[] }): StoreIngredientRow[] {
  return (data.ingredients ?? []).map((ing) => ({
    _id: ing._id,
    name: ing.name,
    category: ing.category,
    storeId: ing.storeId ?? null,
    storeName: ing.storeName ?? null,
  }));
}

/**
 * Fetches admin ingredients when the modal is open and manages selection.
 * When currentStoreId is set (edit mode), pre-selects ingredients linked to that store.
 */
export function useStoreIngredients(
  shouldFetch: boolean,
  currentStoreId: string | null
) {
  const [ingredients, setIngredients] = useState<StoreIngredientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!shouldFetch) {
      setIngredients([]);
      setSelectedIds(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/ingredients")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load ingredients");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = parseIngredients(data);
        setIngredients(list);
        if (currentStoreId) {
          const initial = new Set(
            list.filter((ing) => ing.storeId === currentStoreId).map((ing) => ing._id)
          );
          setSelectedIds(initial);
        } else {
          setSelectedIds(new Set());
        }
      })
      .catch(() => {
        if (!cancelled) setIngredients([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldFetch, currentStoreId]);

  const toggleSelectedId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return { ingredients, loading, selectedIds, setSelectedIds, toggleSelectedId };
}
