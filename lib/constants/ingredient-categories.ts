/**
 * Shared list of allowed ingredient categories.
 * Used by admin ingredients page and import-export validation.
 */
export const INGREDIENT_CATEGORIES = [
  "Bakery",
  "Canned & jarred",
  "Condiments & sauces",
  "Dairy and Eggs",
  "Dry goods & grains",
  "Frozen",
  "Legumes & pulses (dry)",
  "Nuts & baking",
  "Oils & fats",
  "Produce (veg & fruit)",
  "Spices (whole)",
  "Spices & masalas (ground)",
  "Uncategorized",
  "Falanu",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];
