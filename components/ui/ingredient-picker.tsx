"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, X } from "lucide-react";
import type { IngredientRecord } from "@/lib/interfaces/ingredient";

export interface IngredientPickerProps {
  /**
   * All ingredients available to the user (global + their private ones)
   */
  ingredients: IngredientRecord[];

  /**
   * Called when a user selects an ingredient
   */
  onSelect: (ingredient: IngredientRecord) => void;

  /**
   * Called when user wants to add a missing ingredient
   */
  onAddMissing?: () => void;

  /**
   * Custom placeholder text
   */
  placeholder?: string;

  /**
   * Show loading state
   */
  isLoading?: boolean;

  /**
   * Disable the component
   */
  disabled?: boolean;

  /**
   * Group ingredients by category
   */
  groupByCategory?: boolean;

  /**
   * When true, the list fills available height and scrolls (for mobile view).
   * Parent should give the component a constrained height (e.g. flex-1 min-h-0).
   */
  fillHeight?: boolean;

  /**
   * When false, the "Add missing ingredient" button is not rendered (e.g. when parent renders it in a sticky footer).
   */
  showAddButton?: boolean;

  /**
   * Current cart quantity by ingredientId. If missing, treated as 0.
   */
  cartQuantityByIngredientId?: Record<string, number>;
}

/**
 * IngredientPicker - Mobile-first ingredient selector
 *
 * Features:
 * - Large touch-friendly buttons (min 48px height)
 * - Real-time search by ingredient name
 * - Grouped by category for easy scanning
 * - Badge for pending private ingredients
 * - "Add missing ingredient" action
 * - Optimized for 65+ users on mobile
 */
export function IngredientPicker({
  ingredients,
  onSelect,
  onAddMissing,
  placeholder = "Search ingredients...",
  isLoading = false,
  disabled = false,
  groupByCategory = true,
  fillHeight = false,
  showAddButton = true,
  cartQuantityByIngredientId = {},
}: IngredientPickerProps) {
  const ITEMS_PER_PAGE = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Group ingredients by category
  const groupedIngredients = useMemo(() => {
    const groups: Record<string, IngredientRecord[]> = {};

    ingredients.forEach((ing) => {
      const category = ing.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ing);
    });

    // Sort categories, then ingredients within each
    Object.keys(groups)
      .sort()
      .forEach((category) => {
        groups[category].sort((a, b) => a.name.localeCompare(b.name));
      });

    return groups;
  }, [ingredients]);

  // Filter by search query
  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupByCategory ? null : ingredients; // null means show grouped
    }

    const query = searchQuery.toLowerCase();
    return ingredients.filter((ing) =>
      ing.name.toLowerCase().includes(query)
    );
  }, [searchQuery, ingredients, groupByCategory]);

  // Get categories for tabs
  const categories = useMemo(() => {
    return Object.keys(groupedIngredients).sort();
  }, [groupedIngredients]);

  // Ensure selected tab exists
  const activeTab = selectedTab === "all" || !selectedTab ? "all" : selectedTab;
  const isValidTab = activeTab === "all" || categories.includes(activeTab);
  const currentTab = isValidTab ? activeTab : "all";

  // Determine which ingredients to display
  const displayedIngredients = useMemo(() => {
    if (filteredIngredients) {
      // Showing search results
      return filteredIngredients;
    }

    // Showing by category
    if (currentTab === "all") {
      return ingredients;
    }

    return groupedIngredients[currentTab] || [];
  }, [filteredIngredients, currentTab, groupedIngredients, ingredients]);

  // Group for display if not searching
  const displayGrouped = useMemo(() => {
    if (filteredIngredients || !groupByCategory) {
      return null; // Show flat list
    }

    const grouped: Record<string, IngredientRecord[]> = {};
    displayedIngredients.forEach((ing) => {
      const cat = ing.category || "Uncategorized";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(ing);
    });

    return grouped;
  }, [filteredIngredients, displayedIngredients, groupByCategory]);

  const totalItems = displayedIngredients.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedIngredients = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return displayedIngredients.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedIngredients, safePage, ITEMS_PER_PAGE]);

  const paginatedDisplayGrouped = useMemo(() => {
    if (filteredIngredients || !groupByCategory) {
      return null;
    }

    const grouped: Record<string, IngredientRecord[]> = {};
    paginatedIngredients.forEach((ing) => {
      const cat = ing.category || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ing);
    });
    return grouped;
  }, [filteredIngredients, groupByCategory, paginatedIngredients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, currentTab, ingredients.length]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">Loading ingredients...</span>
      </div>
    );
  }

  const listClassName = fillHeight
    ? "flex-1 min-h-0 overflow-y-auto space-y-2"
    : "space-y-2 max-h-96 overflow-y-auto";

  return (
    <div
      className={
        fillHeight
          ? "flex h-full min-h-0 w-full flex-col gap-4"
          : "w-full space-y-4"
      }
    >
      {/* Search Input */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="pl-10 py-3 text-lg h-12 rounded-lg border-2 border-gray-300"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Category Tabs (only show when not searching) */}
      {!searchQuery && groupByCategory && categories.length > 0 && (
        <Tabs
          value={currentTab}
          onValueChange={setSelectedTab}
          className={fillHeight ? "flex w-full flex-1 flex-col min-h-0" : "w-full"}
        >
          <TabsList className="grid w-full grid-cols-3 gap-1 h-auto shrink-0">
            <TabsTrigger value="all" className="py-2 text-xs sm:text-sm">
              All ({ingredients.length})
            </TabsTrigger>
            {categories.slice(0, 5).map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="py-2 text-xs sm:text-sm"
              >
                {category.split(" ").pop()} ({groupedIngredients[category].length})
              </TabsTrigger>
            ))}
            {categories.length > 6 && (
              <TabsTrigger value="more" className="py-2 text-xs sm:text-sm" disabled>
                +{categories.length - 5}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent
            value={currentTab}
            className={
              fillHeight
                ? "mt-4 flex flex-1 flex-col min-h-0 data-[state=inactive]:hidden"
                : "mt-4"
            }
          >
            {/* Ingredient List */}
            <div className={listClassName}>
              {displayGrouped ? (
                // Grouped view
                Object.entries(paginatedDisplayGrouped ?? {}).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-3 first:mt-0">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {items.map((ingredient) => (
                        <IngredientButton
                          key={ingredient._id?.toString()}
                          ingredient={ingredient}
                          onSelect={onSelect}
                          disabled={disabled}
                          currentCount={
                            cartQuantityByIngredientId[ingredient._id?.toString() ?? ""] ?? 0
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : displayedIngredients.length === 0 ? (
                // Empty state when search has no results
                <div className="py-8 text-center text-gray-500 space-y-3">
                  <p>
                    {searchQuery
                      ? `No ingredients found for "${searchQuery}"`
                      : "No ingredients available"}
                  </p>
                  {searchQuery && onAddMissing && (
                    <button
                      type="button"
                      onClick={onAddMissing}
                      className="text-primary font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                      disabled={disabled}
                    >
                      Add missing ingredient
                    </button>
                  )}
                </div>
              ) : (
                // Flat list
                <div className="space-y-2">
                  {paginatedIngredients.map((ingredient) => (
                    <IngredientButton
                      key={ingredient._id?.toString()}
                      ingredient={ingredient}
                      onSelect={onSelect}
                      disabled={disabled}
                      currentCount={
                        cartQuantityByIngredientId[ingredient._id?.toString() ?? ""] ?? 0
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Flat list if not using tabs */}
      {(!groupByCategory || searchQuery || categories.length === 0) && (
        <div className={listClassName}>
          {displayedIngredients.length === 0 ? (
            <div className="py-8 text-center text-gray-500 space-y-3">
              <p>
                {searchQuery
                  ? `No ingredients found for "${searchQuery}"`
                  : "No ingredients available"}
              </p>
              {searchQuery && onAddMissing && (
                <button
                  type="button"
                  onClick={onAddMissing}
                  className="text-primary font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                  disabled={disabled}
                >
                  Add missing ingredient
                </button>
              )}
            </div>
          ) : (
            paginatedIngredients.map((ingredient) => (
              <IngredientButton
                key={ingredient._id?.toString()}
                ingredient={ingredient}
                onSelect={onSelect}
                disabled={disabled}
                currentCount={
                  cartQuantityByIngredientId[ingredient._id?.toString() ?? ""] ?? 0
                }
              />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalItems > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            Previous
          </Button>
          <span>
            Page {safePage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Missing Ingredient Button */}
      {showAddButton && onAddMissing && (
        <Button
          onClick={onAddMissing}
          variant="outline"
          className="w-full h-12 text-base font-semibold border-2 shrink-0"
          disabled={disabled}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Missing Ingredient
        </Button>
      )}
    </div>
  );
}

/**
 * Individual ingredient button
 * Shows ingredient name, unit, category, and pending badge if applicable
 */
function IngredientButton({
  ingredient,
  onSelect,
  disabled,
  currentCount,
}: {
  ingredient: IngredientRecord;
  onSelect: (ingredient: IngredientRecord) => void;
  disabled: boolean;
  currentCount: number;
}) {
  const isPending = ingredient.visibility === "private" && ingredient.status === "pending";

  return (
    <button
      onClick={() => onSelect(ingredient)}
      disabled={disabled}
      className="w-full text-left p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base text-gray-900 truncate">
              {ingredient.name}
            </span>
            {isPending && (
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                Pending
              </Badge>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-600">{ingredient.defaultUnit}</span>
            {ingredient.category && (
              <>
                <span className="mx-2">•</span>
                <span>{ingredient.category}</span>
              </>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            In cart: <span className="font-semibold tabular-nums">{currentCount}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
