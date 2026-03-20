/**
 * Shared list of allowed units.
 * Used by admin ingredients page, import-export validation, and add-missing-ingredient form.
 * Canonical stored value is shortName (e.g. "lbs", "pc", "g"). Seed script normalizeUnit
 * in scripts/seed-ingredients.mjs must map product units to these shortNames.
 */
export const UNITS = [
  { id: "lbs", name: "Pounds", shortName: "lbs", isActive: true },
  { id: "packets", name: "Packets", shortName: "pkt", isActive: true },
  { id: "bunches", name: "Bunches", shortName: "bunch", isActive: true },
  { id: "cases", name: "Cases", shortName: "case", isActive: true },
  { id: "gallons", name: "Gallons", shortName: "gal", isActive: true },
  { id: "ounces", name: "Ounces", shortName: "oz", isActive: true },
  { id: "grams", name: "Grams", shortName: "g", isActive: true },
  { id: "bottles", name: "Bottles", shortName: "btl", isActive: true },
  { id: "cans", name: "Cans", shortName: "can", isActive: true },
  { id: "pieces", name: "Pieces", shortName: "pc", isActive: true },
  { id: "boxes", name: "Boxes", shortName: "box", isActive: true },
  { id: "count", name: "Count", shortName: "ct", isActive: true },
  { id: "kg", name: "Kilograms", shortName: "kg", isActive: true },
] as const;

export type UnitRecord = (typeof UNITS)[number];
export type UnitShortName = UnitRecord["shortName"];

/** Active unit shortNames for validation and dropdown values (stored in DB/API). */
export const ALLOWED_UNIT_VALUES: readonly string[] = UNITS.filter((u) => u.isActive).map(
  (u) => u.shortName
);

/** Default unit when none is specified (pieces). */
export const DEFAULT_UNIT: UnitShortName = "pc";

/** Options for unit select dropdowns: { value: shortName, label: "Name (shortName)" }. */
export function getUnitSelectOptions(): { value: string; label: string }[] {
  return UNITS.filter((u) => u.isActive).map((u) => ({
    value: u.shortName,
    label: `${u.name} (${u.shortName})`,
  }));
}
