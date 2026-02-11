"use client";

import { useEffect, useState, Fragment, useMemo } from "react";
import { Edit2, List, Rows3, LayoutGrid, ChevronDown, ChevronRight, Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ViewMode = "table" | "expandable" | "cards";

type Store = { _id: string; name: string };

type IngredientRow = {
  _id: string;
  name: string;
  category: string;
  defaultUnit: string;
  storeId: string | null;
  storeName: string | null;
  notes: string;
  visibility: string;
  status: string;
  ownerUserId: string | null;
  stockOnHand: number | null;
  reorderThreshold: number | null;
  createdBy: string | null;
  createdAt: string;
};

export default function AdminIngredientsPage() {
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<IngredientRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDefaultUnit, setFormDefaultUnit] = useState("");
  const [formStoreId, setFormStoreId] = useState<string | null>(null);
  const [formNotes, setFormNotes] = useState("");
  const [formVisibility, setFormVisibility] = useState<"global" | "private">("global");
  const [formStatus, setFormStatus] = useState<"active" | "pending">("active");
  const [formStockOnHand, setFormStockOnHand] = useState<string>("");
  const [formReorderThreshold, setFormReorderThreshold] = useState<string>("");

  const [viewMode, setViewMode] = useState<ViewMode>("expandable");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [filterStores, setFilterStores] = useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IngredientRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchIngredients = async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/ingredients");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load: ${res.status}`);
      }
      const data = await res.json();
      setIngredients(data.ingredients ?? []);
      setStores(data.stores ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ingredients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const openEdit = (row: IngredientRow) => {
    setEditing(row);
    setFormName(row.name);
    setFormCategory(row.category);
    setFormDefaultUnit(row.defaultUnit);
    setFormStoreId(row.storeId);
    setFormNotes(row.notes ?? "");
    setFormVisibility(row.visibility as "global" | "private");
    setFormStatus(row.status as "active" | "pending");
    setFormStockOnHand(row.stockOnHand != null ? String(row.stockOnHand) : "");
    setFormReorderThreshold(
      row.reorderThreshold != null ? String(row.reorderThreshold) : ""
    );
    setSaveError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setSaveError(null);
  };

  const openCreate = () => {
    setFormName("");
    setFormCategory("Uncategorized");
    setFormDefaultUnit("pcs");
    setFormStoreId(null);
    setFormNotes("");
    setFormVisibility("global");
    setFormStatus("active");
    setFormStockOnHand("");
    setFormReorderThreshold("");
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formCategory.trim() || !formDefaultUnit.trim()) {
      setCreateError("Name, category, and unit are required.");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory.trim(),
          defaultUnit: formDefaultUnit.trim(),
          storeId: formStoreId || null,
          notes: formNotes.trim() || "",
          visibility: formVisibility,
          status: formStatus,
          stockOnHand: formStockOnHand === "" ? null : Number(formStockOnHand),
          reorderThreshold: formReorderThreshold === "" ? null : Number(formReorderThreshold),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to create");
      }
      setIngredients((prev) => [data.ingredient, ...prev]);
      closeCreate();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setIsCreating(false);
    }
  };

  const openDeleteConfirm = (row: IngredientRow) => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/ingredients/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      setIngredients((prev) => prev.filter((ing) => ing._id !== deleteTarget._id));
      closeDeleteConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      closeDeleteConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/ingredients/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim() || undefined,
          category: formCategory.trim() || undefined,
          defaultUnit: formDefaultUnit.trim() || undefined,
          storeId: formStoreId || null,
          notes: formNotes.trim() || "",
          visibility: formVisibility,
          status: formStatus,
          stockOnHand:
            formStockOnHand === "" ? null : Number(formStockOnHand),
          reorderThreshold:
            formReorderThreshold === ""
              ? null
              : Number(formReorderThreshold),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }
      setIngredients((prev) =>
        prev.map((ing) =>
          ing._id === editing._id ? { ...ing, ...data.ingredient } : ing
        )
      );
      closeEdit();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const defaultUnits = ["kg", "g", "pcs", "l", "ml", "bunch", "clove", "tsp", "tbsp"];

  const ingredientCategories = [
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
    "Falanu"
  ];
  const categoryOptions =
    editing && formCategory && !ingredientCategories.includes(formCategory)
      ? [formCategory, ...ingredientCategories].sort()
      : ingredientCategories;

  const filteredAndSortedIngredients = useMemo(() => {
    let list = ingredients;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (ing) =>
          ing.name.toLowerCase().includes(q) ||
          (ing.notes && ing.notes.toLowerCase().includes(q)) ||
          ing.category.toLowerCase().includes(q) ||
          (ing.storeName && ing.storeName.toLowerCase().includes(q))
      );
    }

    if (filterCategories.size > 0) {
      list = list.filter((ing) => filterCategories.has(ing.category));
    }
    if (filterStores.size > 0) {
      list = list.filter(
        (ing) => ing.storeId != null && filterStores.has(ing.storeId)
      );
    }

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients, searchQuery, filterCategories, filterStores]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Ingredients</h1>
          <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">
            Manage and edit ingredients. All attributes are editable.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 min-h-[200px]">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="space-y-4">
                <div className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg sm:text-xl shrink-0">
                    All ingredients ({filteredAndSortedIngredients.length}
                    {filteredAndSortedIngredients.length !== ingredients.length
                      ? ` of ${ingredients.length}`
                      : ""}
                    )
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <TooltipProvider delayDuration={300}>
                      <div className="hidden sm:flex gap-1 rounded-lg border p-1 bg-slate-50 min-h-[44px] sm:min-h-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={viewMode === "table" ? "secondary" : "ghost"}
                              size="sm"
                              className={`h-9 gap-1.5 sm:h-8 shrink-0 ${viewMode === "table" ? "bg-slate-700 text-white hover:bg-slate-800 hover:text-white" : ""}`}
                              onClick={() => setViewMode("table")}
                            >
                              <List className="size-4" />
                              Table
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Table</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={viewMode === "expandable" ? "secondary" : "ghost"}
                              size="sm"
                              className={`h-9 gap-1.5 sm:h-8 shrink-0 ${viewMode === "expandable" ? "bg-slate-700 text-white hover:bg-slate-800 hover:text-white" : ""}`}
                              onClick={() => setViewMode("expandable")}
                            >
                              <Rows3 className="size-4" />
                              Expandable
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Expandable</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={viewMode === "cards" ? "secondary" : "ghost"}
                              size="sm"
                              className={`h-9 gap-1.5 sm:h-8 shrink-0 ${viewMode === "cards" ? "bg-slate-700 text-white hover:bg-slate-800 hover:text-white" : ""}`}
                              onClick={() => setViewMode("cards")}
                            >
                              <LayoutGrid className="size-4" />
                              Cards
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cards</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                    <Button
                      size="sm"
                      className="h-9 min-h-[44px] gap-1.5 sm:min-h-0 shrink-0"
                      onClick={openCreate}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[140px] order-first w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Search by name, category, store, notes…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 min-h-[44px] sm:min-h-0 w-full"
                    />
                  </div>
                  <TooltipProvider delayDuration={300}>
                  <div className="sm:hidden relative flex h-10 w-28 rounded-lg border border-slate-200 bg-slate-100 p-1 shrink-0">
                    <div
                      className="absolute top-1 bottom-1 rounded-md bg-slate-700 shadow-sm transition-[left] duration-200 ease-out"
                      style={{
                        left: `calc(4px + (100% - 8px) / 3 * ${viewMode === "table" ? 0 : viewMode === "expandable" ? 1 : 2})`,
                        width: "calc((100% - 8px) / 3)",
                      }}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Table view"
                          className={`relative z-10 flex h-full flex-1 min-w-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${viewMode === "table" ? "text-white" : "text-slate-600"}`}
                          onClick={() => setViewMode("table")}
                        >
                          <List className="size-4 shrink-0" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Table</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Expandable view"
                          className={`relative z-10 flex h-full flex-1 min-w-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${viewMode === "expandable" ? "text-white" : "text-slate-600"}`}
                          onClick={() => setViewMode("expandable")}
                        >
                          <Rows3 className="size-4 shrink-0" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Expandable</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Cards view"
                          className={`relative z-10 flex h-full flex-1 min-w-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${viewMode === "cards" ? "text-white" : "text-slate-600"}`}
                          onClick={() => setViewMode("cards")}
                        >
                          <LayoutGrid className="size-4 shrink-0" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Cards</TooltipContent>
                    </Tooltip>
                  </div>
                    </TooltipProvider>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 min-h-[44px] gap-1.5 sm:min-h-0"
                        >
                          Category
                          {filterCategories.size > 0 && (
                            <span className="text-xs opacity-80">
                              ({filterCategories.size})
                            </span>
                          )}
                          <ChevronDown className="size-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 max-h-[320px] overflow-y-auto p-3" align="start">
                        <div className="flex flex-wrap gap-2">
                          {ingredientCategories.map((cat) => {
                            const selected = filterCategories.has(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setFilterCategories((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(cat)) next.delete(cat);
                                    else next.add(cat);
                                    return next;
                                  });
                                }}
                                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                  selected
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                          {filterCategories.size > 0 && (
                            <button
                              type="button"
                              onClick={() => setFilterCategories(new Set())}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 min-h-[44px] gap-1.5 sm:min-h-0"
                        >
                          Store
                          {filterStores.size > 0 && (
                            <span className="text-xs opacity-80">
                              ({filterStores.size})
                            </span>
                          )}
                          <ChevronDown className="size-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 max-h-[320px] overflow-y-auto p-3" align="start">
                        <div className="flex flex-wrap gap-2">
                          {stores.map((store) => {
                            const selected = filterStores.has(store._id);
                            return (
                              <button
                                key={store._id}
                                type="button"
                                onClick={() => {
                                  setFilterStores((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(store._id)) next.delete(store._id);
                                    else next.add(store._id);
                                    return next;
                                  });
                                }}
                                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                  selected
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {store.name}
                              </button>
                            );
                          })}
                          {filterStores.size > 0 && (
                            <button
                              type="button"
                              onClick={() => setFilterStores(new Set())}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                </div>
              </CardHeader>
            </Card>

            {filteredAndSortedIngredients.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  {ingredients.length === 0
                    ? "No ingredients yet. Use + Add to create one."
                    : "No ingredients match your search or filter. Try different terms or clear filters."}
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <Card>
                <CardContent className="p-3 sm:pt-6 sm:px-6">
                  <div className="overflow-x-auto -mx-3 sm:mx-0 pl-4 sm:pl-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-0">Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead className="hidden md:table-cell">Notes</TableHead>
                          <TableHead className="w-[100px] sm:w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedIngredients.map((ing) => (
                          <TableRow key={ing._id} className="min-h-[48px]">
                            <TableCell className="font-medium py-3 pl-0">{ing.name}</TableCell>
                            <TableCell className="py-3">{ing.category}</TableCell>
                            <TableCell className="py-3">{ing.defaultUnit}</TableCell>
                            <TableCell className="py-3">{ing.storeName ?? "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate py-3 hidden md:table-cell">
                              {ing.notes || "—"}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9"
                                  onClick={() => openEdit(ing)}
                                >
                                  <Edit2 className="size-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50 sm:h-9 sm:w-9"
                                  onClick={() => openDeleteConfirm(ing)}
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === "expandable" ? (
              <Card>
                <CardContent className="p-3 sm:pt-6 sm:px-6 overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 shrink-0" />
                        <TableHead className="min-w-0">Name</TableHead>
                        <TableHead className="w-[88px] shrink-0">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedIngredients.map((ing) => {
                        const isExpanded = expandedIds.has(ing._id);
                        return (
                          <Fragment key={ing._id}>
                            <TableRow
                              className="cursor-pointer hover:bg-slate-50 min-h-[48px]"
                              onClick={() => toggleExpanded(ing._id)}
                            >
                              <TableCell className="w-10 py-3 shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="size-4 text-slate-500" />
                                ) : (
                                  <ChevronRight className="size-4 text-slate-500" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium py-3 min-w-0 break-words">
                                {ing.name}
                              </TableCell>
                              <TableCell className="py-2 w-[88px] shrink-0" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9"
                                    onClick={() => openEdit(ing)}
                                  >
                                    <Edit2 className="size-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50 sm:h-9 sm:w-9"
                                    onClick={() => openDeleteConfirm(ing)}
                                  >
                                    <Trash2 className="size-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${ing._id}-detail`} className="bg-slate-50/80">
                                <TableCell colSpan={3} className="py-3 px-3 sm:px-6">
                                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 sm:gap-x-6">
                                    <div>
                                      <span className="text-slate-500">Category</span>
                                      <p className="font-medium">{ing.category}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Store</span>
                                      <p className="font-medium">{ing.storeName ?? "—"}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Unit</span>
                                      <p className="font-medium">{ing.defaultUnit}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                      <span className="text-slate-500">Notes</span>
                                      <p className="font-medium">{ing.notes || "—"}</p>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedIngredients.map((ing) => (
                  <Card key={ing._id} className="flex flex-col">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-3 sm:p-6 sm:pb-2">
                      <CardTitle className="text-base leading-tight sm:text-lg">{ing.name}</CardTitle>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9"
                          onClick={() => openEdit(ing)}
                        >
                          <Edit2 className="size-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50 sm:h-9 sm:w-9"
                          onClick={() => openDeleteConfirm(ing)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2 text-sm p-3 pt-0 sm:p-6 sm:pt-0">
                      <div>
                        <span className="text-slate-500">Category</span>
                        <p className="font-medium">{ing.category}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Store</span>
                        <p className="font-medium">{ing.storeName ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Unit</span>
                        <p className="font-medium">{ing.defaultUnit}</p>
                      </div>
                      {ing.notes ? (
                        <div>
                          <span className="text-slate-500">Notes</span>
                          <p className="font-medium">{ing.notes}</p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit ingredient</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-4">
              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formCategory}
                  onValueChange={setFormCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Default unit</Label>
                <Select
                  value={formDefaultUnit}
                  onValueChange={setFormDefaultUnit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultUnits.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Store</Label>
                <Select
                  value={formStoreId ?? "none"}
                  onValueChange={(v) => setFormStoreId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No store</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Visibility</Label>
                  <Select
                    value={formVisibility}
                    onValueChange={(v) =>
                      setFormVisibility(v as "global" | "private")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(v) =>
                      setFormStatus(v as "active" | "pending")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-stock">Stock on hand</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min={0}
                    value={formStockOnHand}
                    onChange={(e) => setFormStockOnHand(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-reorder">Reorder threshold</Label>
                  <Input
                    id="edit-reorder"
                    type="number"
                    min={0}
                    value={formReorderThreshold}
                    onChange={(e) => setFormReorderThreshold(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => !open && closeCreate()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add new ingredient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Olive oil"
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ingredientCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Default unit</Label>
              <Select value={formDefaultUnit} onValueChange={setFormDefaultUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {defaultUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Store</Label>
              <Select
                value={formStoreId ?? "none"}
                onValueChange={(v) => setFormStoreId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No store</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Input
                id="create-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Visibility</Label>
                <Select
                  value={formVisibility}
                  onValueChange={(v) =>
                    setFormVisibility(v as "global" | "private")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) =>
                    setFormStatus(v as "active" | "pending")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-stock">Stock on hand</Label>
                <Input
                  id="create-stock"
                  type="number"
                  min={0}
                  value={formStockOnHand}
                  onChange={(e) => setFormStockOnHand(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-reorder">Reorder threshold</Label>
                <Input
                  id="create-reorder"
                  type="number"
                  min={0}
                  value={formReorderThreshold}
                  onChange={(e) => setFormReorderThreshold(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreate} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ingredient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
