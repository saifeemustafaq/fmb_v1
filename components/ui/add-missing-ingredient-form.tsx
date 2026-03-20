"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Textarea } from "./textarea";
import { X } from "lucide-react";
import { getUnitSelectOptions } from "@/lib/constants/units";

// Common ingredient categories
const CATEGORIES = [
  "Spices (whole)",
  "Spices (ground)",
  "Vegetables",
  "Fruits",
  "Grains & Rice",
  "Lentils & Pulses",
  "Dairy",
  "Fresh Herbs",
  "Dry Goods",
  "Oil & Ghee",
  "Other",
];

interface AddMissingIngredientFormProps {
  onSubmit: (data: {
    name: string;
    category: string;
    unit: string;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AddMissingIngredientForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: AddMissingIngredientFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Ingredient name is required");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    if (!unit) {
      setError("Please select a unit");
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        category,
        unit,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ingredient");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Single header: title + X */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">
          Add missing ingredient
        </h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ingredient-name" className="text-base">
            Ingredient name *
          </Label>
          <Input
            id="ingredient-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Kashmiri Red Chili"
            disabled={isLoading}
            className="h-14 text-base"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredient-category" className="text-base">
            Category *
          </Label>
          <Select
            value={category}
            onValueChange={setCategory}
            disabled={isLoading}
            required
          >
            <SelectTrigger id="ingredient-category" className="h-14 text-base">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-base">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredient-unit" className="text-base">
            Unit *
          </Label>
          <Select
            value={unit}
            onValueChange={setUnit}
            disabled={isLoading}
            required
          >
            <SelectTrigger id="ingredient-unit" className="h-14 text-base">
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {getUnitSelectOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-base">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredient-notes" className="text-base">
            Notes (optional)
          </Label>
          <Textarea
            id="ingredient-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            disabled={isLoading}
            className="min-h-[80px] text-base"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="h-14 flex-1 text-base font-medium"
          >
            {isLoading ? "Adding..." : "Add ingredient"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            disabled={isLoading}
            className="h-14 flex-1 text-base font-medium"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
