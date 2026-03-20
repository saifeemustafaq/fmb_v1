"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, Download, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { INGREDIENT_CATEGORIES } from "@/lib/constants/ingredient-categories";
import { ALLOWED_UNIT_VALUES, DEFAULT_UNIT, getUnitSelectOptions } from "@/lib/constants/units";
import { parseCSV, stringifyCSV } from "@/lib/csv";

const REQUIRED_HEADERS = ["Name", "Category", "Store", "Unit"];

type Store = { _id: string; name: string };
type Ingredient = {
  _id: string;
  name: string;
  category: string;
  defaultUnit: string;
  storeId: string | null;
  storeName: string | null;
  notes: string;
};

type ParsedRow = {
  rowIndex: number;
  name: string;
  category: string;
  store: string;
  unit: string;
  notes: string;
};

function downloadBlob(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminImportExportPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exportFilterCategories, setExportFilterCategories] = useState<Set<string>>(new Set());
  const [exportFilterStores, setExportFilterStores] = useState<Set<string>>(new Set());
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [storeMapping, setStoreMapping] = useState<Record<string, string>>({});
  const [unitMapping, setUnitMapping] = useState<Record<string, string>>({});
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<number, "discard" | "add">>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: { index: number; message: string }[] } | null>(null);
  const [importInputKey, setImportInputKey] = useState(0);
  const [edgeCasesOpen, setEdgeCasesOpen] = useState(false);

  const resetImportForm = () => {
    setImportFile(null);
    setParsedRows([]);
    setValidationErrors([]);
    setCategoryMapping({});
    setStoreMapping({});
    setUnitMapping({});
    setDuplicateResolutions({});
    setImportInputKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/ingredients")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setIngredients(data.ingredients ?? []);
        setStores(data.stores ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportFiltered = useMemo(() => {
    let list = ingredients;
    if (exportFilterCategories.size > 0) {
      list = list.filter((ing) => exportFilterCategories.has(ing.category));
    }
    if (exportFilterStores.size > 0) {
      list = list.filter((ing) => ing.storeId != null && exportFilterStores.has(ing.storeId));
    }
    return list;
  }, [ingredients, exportFilterCategories, exportFilterStores]);

  const handleExport = () => {
    const rows: string[][] = [
      ["Name", "Category", "Store", "Unit", "Notes"],
      ...exportFiltered.map((ing) => [
        ing.name,
        ing.category,
        ing.storeName ?? "",
        ing.defaultUnit,
        ing.notes ?? "",
      ]),
    ];
    downloadBlob(stringifyCSV(rows), "ingredients-export.csv");
  };

  const handleDownloadSample = () => {
    const sampleRows: string[][] = [
      ["Name", "Category", "Store", "Unit", "Notes"],
      ["Chillies", "Produce (veg & fruit)", "Indian Market", "kg", ""],
      ["Basmati Rice", "Dry goods & grains", "Indian Market", "kg", ""],
    ];
    downloadBlob(stringifyCSV(sampleRows), "ingredients-import-sample.csv");
  };

  const normalizeHeader = (h: string) => h.trim().toLowerCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setImportFile(file ?? null);
    setParsedRows([]);
    setValidationErrors([]);
    setCategoryMapping({});
    setStoreMapping({});
    setUnitMapping({});
    setDuplicateResolutions({});
    setImportResult(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rawRows = parseCSV(text);
      if (rawRows.length === 0) {
        setValidationErrors(["File is empty or could not be parsed."]);
        return;
      }
      const headers = rawRows[0].map((c) => c.trim());
      const nameIdx = headers.findIndex((h) => normalizeHeader(h) === "name");
      const catIdx = headers.findIndex((h) => normalizeHeader(h) === "category");
      const storeIdx = headers.findIndex((h) => normalizeHeader(h) === "store");
      const unitIdx = headers.findIndex((h) => normalizeHeader(h) === "unit");
      const notesIdx = headers.findIndex((h) => normalizeHeader(h) === "notes");
      if (nameIdx === -1 || catIdx === -1 || storeIdx === -1 || unitIdx === -1) {
        setValidationErrors(["Invalid file. First row must be: Name, Category, Store, Unit."]);
        return;
      }
      const errors: string[] = [];
      const rows: ParsedRow[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        const name = (row[nameIdx] ?? "").trim();
        const category = (row[catIdx] ?? "").trim();
        const store = (row[storeIdx] ?? "").trim();
        const unit = ((row[unitIdx] ?? "").trim()) || DEFAULT_UNIT;
        const notes = (notesIdx >= 0 ? (row[notesIdx] ?? "").trim() : "") || "";
        if (!name && !category && !store) continue;
        if (!name) {
          errors.push(`Row ${i + 1}: Name is missing.`);
          continue;
        }
        const missing: string[] = [];
        if (!category) missing.push("Category");
        if (!store) missing.push("Store");
        if (missing.length === 1) {
          errors.push(`Row ${i + 1}: ${missing[0]} value of ${name} is missing.`);
        } else if (missing.length === 2) {
          errors.push(`Row ${i + 1}: Category and Store value of ${name} are missing.`);
        }
        rows.push({ rowIndex: i + 1, name, category, store, unit, notes });
      }
      if (errors.length > 0) {
        setValidationErrors(errors);
        setParsedRows([]);
        return;
      }
      if (rows.length === 0) {
        setValidationErrors(["No rows to import."]);
        return;
      }
      setValidationErrors([]);
      setParsedRows(rows);
    };
    reader.readAsText(file, "UTF-8");
  };

  const storeNames = useMemo(() => stores.map((s) => s.name), [stores]);
  const categorySet = useMemo(() => new Set<string>(INGREDIENT_CATEGORIES), []);
  const unitSet = useMemo(() => new Set<string>(ALLOWED_UNIT_VALUES), []);

  const rowsNeedingCategoryMapping = useMemo(() => {
    const out: { rowIndex: number; name: string; value: string }[] = [];
    const seen = new Set<string>();
    for (const row of parsedRows) {
      if (!row.category || categorySet.has(row.category)) continue;
      const key = row.category;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ rowIndex: row.rowIndex, name: row.name, value: row.category });
    }
    return out;
  }, [parsedRows, categorySet]);

  const rowsNeedingStoreMapping = useMemo(() => {
    const out: { rowIndex: number; name: string; value: string }[] = [];
    const seen = new Set<string>();
    for (const row of parsedRows) {
      if (!row.store || storeNames.includes(row.store)) continue;
      const key = row.store;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ rowIndex: row.rowIndex, name: row.name, value: row.store });
    }
    return out;
  }, [parsedRows, storeNames]);

  const rowsNeedingUnitMapping = useMemo(() => {
    const out: { rowIndex: number; name: string; value: string }[] = [];
    const seen = new Set<string>();
    for (const row of parsedRows) {
      const unit = row.unit || DEFAULT_UNIT;
      if (unitSet.has(unit)) continue;
      if (seen.has(unit)) continue;
      seen.add(unit);
      out.push({ rowIndex: row.rowIndex, name: row.name, value: unit });
    }
    return out;
  }, [parsedRows, unitSet]);

  const resolvedRows = useMemo(() => {
    return parsedRows.map((row) => {
      const category = categorySet.has(row.category) ? row.category : (categoryMapping[row.category] ?? row.category);
      const storeId = storeNames.includes(row.store)
        ? (stores.find((s) => s.name === row.store)?._id ?? null)
        : (storeMapping[row.store] || null);
      const storeName = storeNames.includes(row.store)
        ? row.store
        : (storeId ? stores.find((s) => s._id === storeId)?.name ?? null : null);
      const unit = unitSet.has(row.unit || DEFAULT_UNIT)
        ? (row.unit || DEFAULT_UNIT)
        : (unitMapping[row.unit || DEFAULT_UNIT] ?? row.unit ?? DEFAULT_UNIT);
      return { ...row, category, storeId: storeId ?? null, storeName, unit };
    });
  }, [parsedRows, categoryMapping, storeMapping, unitMapping, stores, storeNames, categorySet, unitSet]);

  const existingByKey = useMemo(() => {
    const map = new Map<string, { storeId: string | null; category: string }>();
    for (const ing of ingredients) {
      const key = ing.name.trim().toLowerCase();
      map.set(key, { storeId: ing.storeId, category: ing.category });
    }
    return map;
  }, [ingredients]);

  const duplicateConflicts = useMemo(() => {
    const conflicts: { rowIndex: number; name: string; category: string; storeName: string }[] = [];
    for (const row of resolvedRows) {
      const storeId = row.storeId ?? "";
      const key = row.name.trim().toLowerCase();
      const existing = existingByKey.get(key);
      if (!existing) continue;
      const sameStore = (existing.storeId ?? "") === (storeId ?? "");
      const sameCategory = existing.category === row.category;
      if (sameStore && sameCategory) continue;
      conflicts.push({
        rowIndex: row.rowIndex,
        name: row.name,
        category: row.category,
        storeName: row.storeName ?? row.store,
      });
    }
    return conflicts;
  }, [resolvedRows, existingByKey]);

  const mappingComplete =
    rowsNeedingCategoryMapping.every((r) => categoryMapping[r.value]) &&
    rowsNeedingStoreMapping.every((r) => storeMapping[r.value]) &&
    rowsNeedingUnitMapping.every((r) => unitMapping[r.value]);
  const canImport = parsedRows.length > 0 && mappingComplete;

  const getFinalName = (
    row: (typeof resolvedRows)[0],
    resolution: "discard" | "add",
    namesAlreadyInBatch: Set<string>
  ): string | null => {
    if (resolution === "discard") return null;
    const base = row.name.trim();
    const key = base.toLowerCase();
    const existing = existingByKey.get(key);
    const storeId = row.storeId ?? "";
    const same = existing && (existing.storeId ?? "") === storeId && existing.category === row.category;
    if (same) return null;
    let suffix = 1;
    let candidate = `${base} (${suffix})`;
    while (ingredients.some((ing) => ing.name === candidate) || namesAlreadyInBatch.has(candidate)) {
      suffix++;
      candidate = `${base} (${suffix})`;
    }
    return candidate;
  };

  const handleImport = async () => {
    if (!canImport) return;
    const toCreate: { name: string; category: string; defaultUnit: string; storeId: string | null; notes: string }[] = [];
    const namesInBatch = new Set<string>();
    for (const row of resolvedRows) {
      const resolution = duplicateResolutions[row.rowIndex] ?? "add";
      const finalName = getFinalName(row, resolution, namesInBatch);
      if (finalName === null) continue;
      namesInBatch.add(finalName);
      toCreate.push({
        name: finalName,
        category: row.category,
        defaultUnit: row.unit,
        storeId: row.storeId ? String(row.storeId) : null,
        notes: row.notes ?? "",
      });
    }
    if (toCreate.length === 0) {
      setImportResult({ created: 0, errors: [{ index: -1, message: "No rows to import (all discarded or already exist)." }] });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/ingredients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: toCreate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportResult({ created: 0, errors: [{ index: -1, message: data.error || "Import failed" }] });
        return;
      }
      setImportResult({ created: data.created ?? 0, errors: data.errors ?? [] });
      if ((data.created ?? 0) > 0) {
        const refetch = await fetch("/api/admin/ingredients");
        if (refetch.ok) {
          const j = await refetch.json();
          setIngredients(j.ingredients ?? []);
        }
      }
      resetImportForm();
    } catch (e) {
      setImportResult({ created: 0, errors: [{ index: -1, message: e instanceof Error ? e.message : "Import failed" }] });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-4xl flex items-center justify-center py-12">
          <Spinner className="size-8" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Import and Export</h1>
        <p className="mt-1 text-sm text-slate-600 sm:mt-2">
          Export ingredients to CSV or import from a CSV file.
        </p>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="size-5" />
              Export
            </CardTitle>
            <p className="text-sm text-slate-600">
              Filter by category and store, then download a CSV. By default all ingredients are included.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Category
                    {exportFilterCategories.size > 0 && <span className="text-xs opacity-80">({exportFilterCategories.size})</span>}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-h-[320px] overflow-y-auto p-3" align="start">
                  <div className="flex flex-wrap gap-2">
                    {INGREDIENT_CATEGORIES.map((cat) => {
                      const selected = exportFilterCategories.has(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setExportFilterCategories((prev) => {
                              const next = new Set(prev);
                              if (next.has(cat)) next.delete(cat);
                              else next.add(cat);
                              return next;
                            });
                          }}
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            selected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                    {exportFilterCategories.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setExportFilterCategories(new Set())}
                        className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Store
                    {exportFilterStores.size > 0 && <span className="text-xs opacity-80">({exportFilterStores.size})</span>}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-h-[320px] overflow-y-auto p-3" align="start">
                  <div className="flex flex-wrap gap-2">
                    {stores.map((store) => {
                      const selected = exportFilterStores.has(store._id);
                      return (
                        <button
                          key={store._id}
                          type="button"
                          onClick={() => {
                            setExportFilterStores((prev) => {
                              const next = new Set(prev);
                              if (next.has(store._id)) next.delete(store._id);
                              else next.add(store._id);
                              return next;
                            });
                          }}
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            selected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {store.name}
                        </button>
                      );
                    })}
                    {exportFilterStores.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setExportFilterStores(new Set())}
                        className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {exportFiltered.length === 0 ? (
              <p className="text-sm text-slate-500">No ingredients match the selected filters.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportPreviewOpen(true)}
                  className="gap-1.5"
                >
                  <Eye className="size-4" />
                  View
                </Button>
                <Button onClick={handleExport} size="sm" className="gap-1.5">
                  <Download className="size-4" />
                  Export CSV ({exportFiltered.length} ingredients)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={exportPreviewOpen} onOpenChange={setExportPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Export preview</DialogTitle>
              <p className="text-sm text-slate-600 font-normal">
                This is what will be included in your CSV download ({exportFiltered.length} ingredient
                {exportFiltered.length === 1 ? "" : "s"}).
              </p>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-auto rounded-md border">
              {exportFiltered.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No ingredients match the selected filters.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Name</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">Store</TableHead>
                      <TableHead className="whitespace-nowrap">Unit</TableHead>
                      <TableHead className="whitespace-nowrap max-w-[200px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportFiltered.map((ing) => (
                      <TableRow key={ing._id}>
                        <TableCell className="font-medium">{ing.name}</TableCell>
                        <TableCell>{ing.category}</TableCell>
                        <TableCell>{ing.storeName ?? "—"}</TableCell>
                        <TableCell>{ing.defaultUnit}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={ing.notes || undefined}>
                          {ing.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportPreviewOpen(false)}>
                Close
              </Button>
              {exportFiltered.length > 0 && (
                <Button
                  onClick={() => {
                    handleExport();
                    setExportPreviewOpen(false);
                  }}
                >
                  Download CSV
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="size-5" />
              Import
            </CardTitle>
            <p className="text-sm text-slate-600">
              Upload a CSV with columns: Name, Category, Store, Unit (optional: Notes). Use the sample file to match the format.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadSample}>
                Download sample CSV
              </Button>
              <div>
                <Label htmlFor="import-file" className="sr-only">
                  Choose CSV file
                </Label>
                <input
                  key={importInputKey}
                  id="import-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground file:hover:bg-primary/90"
                />
              </div>
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {validationErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {parsedRows.length > 0 && validationErrors.length === 0 && (
              <>
                <p className="text-sm text-slate-600">{parsedRows.length} rows parsed.</p>

                {(rowsNeedingCategoryMapping.length > 0 || rowsNeedingStoreMapping.length > 0 || rowsNeedingUnitMapping.length > 0) && (
                  <div className="space-y-4 rounded-md border p-4">
                    <h3 className="font-medium">Fix invalid values</h3>
                    {rowsNeedingCategoryMapping.length > 0 && (
                      <div className="space-y-2">
                        {rowsNeedingCategoryMapping.map((r) => (
                          <div key={`cat-${r.value}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-600">
                              Category &quot;{r.value}&quot; for &quot;{r.name}&quot; is not valid. Map to:
                            </span>
                            <Select
                              value={categoryMapping[r.value] ?? ""}
                              onValueChange={(v) => setCategoryMapping((prev) => ({ ...prev, [r.value]: v }))}
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {INGREDIENT_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                    {rowsNeedingUnitMapping.length > 0 && (
                      <div className="space-y-2">
                        {rowsNeedingUnitMapping.map((r) => (
                          <div key={`unit-${r.value}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-600">
                              Unit &quot;{r.value}&quot; for &quot;{r.name}&quot; is not valid. Map to:
                            </span>
                            <Select
                              value={unitMapping[r.value] ?? ""}
                              onValueChange={(v) => setUnitMapping((prev) => ({ ...prev, [r.value]: v }))}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {getUnitSelectOptions().map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                    {rowsNeedingStoreMapping.length > 0 && (
                      <div className="space-y-2">
                        {rowsNeedingStoreMapping.map((r) => (
                          <div key={`store-${r.value}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-600">
                              Store &quot;{r.value}&quot; for &quot;{r.name}&quot; is not valid. Map to:
                            </span>
                            <Select
                              value={storeMapping[r.value] ?? ""}
                              onValueChange={(v) => setStoreMapping((prev) => ({ ...prev, [r.value]: v }))}
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Select store" />
                              </SelectTrigger>
                              <SelectContent>
                                {stores.map((s) => (
                                  <SelectItem key={s._id} value={s._id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {mappingComplete && duplicateConflicts.length > 0 && (
                  <div className="space-y-3 rounded-md border p-4">
                    <h3 className="font-medium">Duplicate names</h3>
                    <p className="text-sm text-slate-600">
                      These ingredients already exist with a different store or category. Choose to discard or add as a new item with a number suffix.
                    </p>
                    <ul className="space-y-2">
                      {duplicateConflicts.map((c) => (
                        <li key={c.rowIndex} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-slate-500">({c.category}, {c.storeName})</span>
                          <Select
                            value={duplicateResolutions[c.rowIndex] ?? "add"}
                            onValueChange={(v: "discard" | "add") =>
                              setDuplicateResolutions((prev) => ({ ...prev, [c.rowIndex]: v }))
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="discard">Discard this row</SelectItem>
                              <SelectItem value="add">Add as &quot;{c.name} (1)&quot;</SelectItem>
                            </SelectContent>
                          </Select>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {canImport && (
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? "Importing…" : "Confirm import"}
                  </Button>
                )}

                {importResult && (
                  <Alert variant={importResult.errors.length > 0 ? "destructive" : "default"}>
                    <AlertDescription>
                      <p className="font-medium">
                        Imported {importResult.created} ingredient(s).
                        {importResult.errors.length > 0 && ` ${importResult.errors.length} failed.`}
                      </p>
                      {importResult.errors.length > 0 && (
                        <ul className="mt-2 list-disc pl-4 space-y-1 text-sm">
                          {importResult.errors.map((e, i) => (
                            <li key={i}>
                              {e.index >= 0 ? `Row ${e.index + 1}: ` : ""}{e.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Collapsible className="mt-6" open={edgeCasesOpen} onOpenChange={setEdgeCasesOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            <span>How we handle edge cases and ambiguities</span>
            <ChevronDown
              className={`size-4 shrink-0 transition-transform ${edgeCasesOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-lg border border-t-0 bg-slate-50/50 px-4 py-3 text-sm text-slate-600 space-y-3">
              <p className="font-medium text-slate-700">File and headers</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Wrong or missing headers</strong> — The first row must be exactly: Name, Category, Store, Unit (Notes is optional). If any of the first four are missing or named differently, the file is rejected and we show a clear error.</li>
                <li><strong>Empty file or only headers</strong> — We report &quot;No rows to import.&quot;</li>
                <li><strong>Empty rows</strong> — Rows where all cells are blank are skipped.</li>
              </ul>
              <p className="font-medium text-slate-700 pt-1">Required and optional fields</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Missing Name</strong> — Row is invalid; we report the row number.</li>
                <li><strong>Missing Category or Store when Name is present</strong> — We report e.g. &quot;Category value of Chillies is missing&quot; or &quot;Category and Store value of Chillies are missing.&quot; Import cannot proceed until these are fixed in the file or you re-upload.</li>
                <li><strong>Missing Unit</strong> — Treated as optional; we use &quot;pc&quot; (pieces) as the default. If the file has a unit value that isn’t in the allowed list, you’ll be prompted to map it to a valid unit (same as category and store).</li>
                <li><strong>Notes</strong> — Optional; empty is fine.</li>
              </ul>
              <p className="font-medium text-slate-700 pt-1">Invalid Category, Store, or Unit</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Category must match one of the allowed categories in the app. Store must match an existing store name. Unit must match one of the allowed units (e.g. kg, g, pc, lbs, oz, bunch, case).</li>
                <li>If a value doesn’t match, we don’t reject the row. We show a <strong>mapping</strong> step: you choose the correct category, store, or unit from a dropdown. The same mapping is reused for every row that has that invalid value.</li>
              </ul>
              <p className="font-medium text-slate-700 pt-1">Duplicate names</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Same name, same store and category as existing</strong> — Treated as already existing; that row is skipped (no duplicate created).</li>
                <li><strong>Same name, different store or category</strong> — We show a <strong>Duplicate names</strong> section. For each such row you choose: <strong>Discard</strong> (skip this row) or <strong>Add as new</strong> (create a new ingredient with a number suffix, e.g. &quot;Chillies (1)&quot;, &quot;Chillies (2)&quot; so they stay distinct).</li>
              </ul>
              <p className="font-medium text-slate-700 pt-1">Encoding and format</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>File is read as UTF-8. Cells with commas, quotes, or newlines should be wrapped in double quotes in the CSV; we parse quoted fields correctly.</li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </main>
  );
}
