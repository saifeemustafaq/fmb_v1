"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { StoreIngredientRow } from "@/hooks/use-store-ingredients";

type StoreIngredientsPickerProps = {
  ingredients: StoreIngredientRow[];
  loading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (id: string) => void;
  /** When set (edit mode), ingredients linked to this store are sorted first and "other store" label uses this to hide for current store */
  currentStoreId: string | null;
};

export function StoreIngredientsPicker({
  ingredients,
  loading,
  selectedIds,
  onSelectionChange,
  currentStoreId,
}: StoreIngredientsPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = ingredients;
    if (q) {
      list = list.filter(
        (ing) =>
          ing.name.toLowerCase().includes(q) ||
          ing.category.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (currentStoreId) {
        const aThis = a.storeId === currentStoreId ? 1 : 0;
        const bThis = b.storeId === currentStoreId ? 1 : 0;
        if (aThis !== bThis) return bThis - aThis;
      }
      const aOther = a.storeId != null && a.storeId !== currentStoreId ? 1 : 0;
      const bOther = b.storeId != null && b.storeId !== currentStoreId ? 1 : 0;
      if (aOther !== bOther) return aOther - bOther;
      return a.name.localeCompare(b.name);
    });
  }, [ingredients, searchQuery, currentStoreId]);

  const handleToggle = (id: string) => {
    onSelectionChange(id);
  };

  return (
    <div className="grid gap-2 border-t pt-4">
      <Label>Link ingredients to this store</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input
          type="search"
          placeholder="Search by name or category…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-[240px] overflow-y-auto rounded-md border bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            {ingredients.length === 0
              ? "No ingredients in the database."
              : "No ingredients match your search."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {filteredAndSorted.map((ing) => {
              const selected = selectedIds.has(ing._id);
              const otherStore =
                ing.storeId != null &&
                ing.storeId !== currentStoreId &&
                ing.storeName;
              return (
                <li key={ing._id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-none"
                    onClick={() => handleToggle(ing._id)}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => {}}
                      aria-hidden
                      className="pointer-events-none shrink-0"
                    />
                    <span className="flex-1 min-w-0 truncate font-medium text-slate-900">
                      {ing.name}
                    </span>
                    {otherStore && (
                      <span className="shrink-0 text-xs text-slate-500">
                        ({ing.storeName})
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
