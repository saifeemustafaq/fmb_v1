"use client";

import { useEffect, useState, useMemo } from "react";
import { Edit2, Trash2, Plus, Search } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

type StoreRow = {
  _id: string;
  name: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: string | null;
};

type EditIngredientRow = {
  _id: string;
  name: string;
  category: string;
  storeId: string | null;
  storeName: string | null;
};

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const [editIngredients, setEditIngredients] = useState<EditIngredientRow[]>([]);
  const [editIngredientsLoading, setEditIngredientsLoading] = useState(false);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const [editIngredientSearch, setEditIngredientSearch] = useState("");

  const fetchStores = async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/stores");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load: ${res.status}`);
      }
      const data = await res.json();
      setStores(data.stores ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [stores, searchQuery]);

  const filteredEditIngredients = useMemo(() => {
    const q = editIngredientSearch.trim().toLowerCase();
    let list = editIngredients;
    if (q) {
      list = list.filter(
        (ing) =>
          ing.name.toLowerCase().includes(q) ||
          ing.category.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (!editing) return 0;
      const aThis = a.storeId === editing._id ? 1 : 0;
      const bThis = b.storeId === editing._id ? 1 : 0;
      if (aThis !== bThis) return bThis - aThis;
      const aOther = a.storeId != null && a.storeId !== editing._id ? 1 : 0;
      const bOther = b.storeId != null && b.storeId !== editing._id ? 1 : 0;
      if (aOther !== bOther) return aOther - bOther;
      return a.name.localeCompare(b.name);
    });
  }, [editIngredients, editIngredientSearch, editing]);

  const openCreate = () => {
    setFormName("");
    setFormAddress("");
    setFormNotes("");
    setFormIsActive(true);
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
          isActive: formIsActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setStores((prev) => [data.store, ...prev]);
      closeCreate();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (store: StoreRow) => {
    setEditing(store);
    setFormName(store.name);
    setFormAddress(store.address ?? "");
    setFormNotes(store.notes ?? "");
    setFormIsActive(store.isActive);
    setSaveError(null);
    setEditIngredients([]);
    setSelectedIngredientIds(new Set());
    setEditIngredientSearch("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setSaveError(null);
    setEditIngredients([]);
    setSelectedIngredientIds(new Set());
    setEditIngredientSearch("");
    setEditIngredientsLoading(false);
  };

  useEffect(() => {
    if (!editOpen || !editing) return;
    let cancelled = false;
    setEditIngredientsLoading(true);
    fetch("/api/admin/ingredients")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load ingredients");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: EditIngredientRow[] = (data.ingredients ?? []).map(
          (ing: { _id: string; name: string; category: string; storeId: string | null; storeName: string | null }) => ({
            _id: ing._id,
            name: ing.name,
            category: ing.category,
            storeId: ing.storeId ?? null,
            storeName: ing.storeName ?? null,
          })
        );
        setEditIngredients(list);
        const selected = new Set(
          list.filter((ing) => ing.storeId === editing._id).map((ing) => ing._id)
        );
        setSelectedIngredientIds(selected);
      })
      .catch(() => {
        if (!cancelled) setEditIngredients([]);
      })
      .finally(() => {
        if (!cancelled) setEditIngredientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editOpen, editing?._id]);

  const handleSave = async () => {
    if (!editing) return;
    if (!formName.trim()) {
      setSaveError("Name is required.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/stores/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress.trim() || "",
          notes: formNotes.trim() || "",
          isActive: formIsActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setStores((prev) =>
        prev.map((s) => (s._id === editing._id ? data.store : s))
      );

      const toAssociate = editIngredients.filter(
        (ing) => selectedIngredientIds.has(ing._id) && ing.storeId !== editing._id
      );
      const toDisassociate = editIngredients.filter(
        (ing) => ing.storeId === editing._id && !selectedIngredientIds.has(ing._id)
      );
      const patchPromises: Promise<Response>[] = [];
      for (const ing of toAssociate) {
        patchPromises.push(
          fetch(`/api/admin/ingredients/${ing._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeId: editing._id }),
          })
        );
      }
      for (const ing of toDisassociate) {
        patchPromises.push(
          fetch(`/api/admin/ingredients/${ing._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeId: null }),
          })
        );
      }
      const patchResults = await Promise.all(patchPromises);
      const failed = patchResults.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(
          `Failed to update ${failed.length} ingredient(s). Try again.`
        );
      }
      closeEdit();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (store: StoreRow) => {
    setDeleteTarget(store);
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
      const res = await fetch(`/api/admin/stores/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      setStores((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      closeDeleteConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      closeDeleteConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 sm:mb-6 flex flex-row items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Stores
            </h1>
            <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">
              Stores where ingredients can be sourced from.
            </p>
          </div>
          <Button
            size="sm"
            className="h-9 min-h-[44px] gap-1.5 sm:min-h-0 shrink-0"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Add
          </Button>
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
          <Card>
            <CardHeader className="space-y-4">
              <CardTitle className="text-lg sm:text-xl">
                All stores ({filteredStores.length}
                {filteredStores.length !== stores.length
                  ? ` of ${stores.length}`
                  : ""}
              </CardTitle>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search by name, address, notes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 min-h-[44px] sm:min-h-0"
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="overflow-x-auto pl-4 sm:pl-0 -mx-3 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-0">Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="hidden md:table-cell">Notes</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px] sm:w-[120px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStores.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-slate-500"
                        >
                          {stores.length === 0
                            ? "No stores in the database. Use Add to create one or run npm run seed:stores."
                            : "No stores match your search."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStores.map((store) => (
                        <TableRow key={store._id} className="min-h-[48px]">
                          <TableCell className="font-medium py-3 pl-0">
                            {store.name}
                          </TableCell>
                          <TableCell className="py-3">
                            {store.address || "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate py-3 hidden md:table-cell">
                            {store.notes || "—"}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant={
                                store.isActive ? "default" : "secondary"
                              }
                              className={
                                store.isActive
                                  ? "bg-green-600 hover:bg-green-700"
                                  : ""
                              }
                            >
                              {store.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9"
                                onClick={() => openEdit(store)}
                              >
                                <Edit2 className="size-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 hover:bg-red-50 sm:h-9 sm:w-9"
                                onClick={() => openDeleteConfirm(store)}
                              >
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => !open && closeCreate()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add store</DialogTitle>
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
                placeholder="Store name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-address">Address</Label>
              <Input
                id="create-address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Optional"
              />
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
            <div className="flex items-center gap-2">
              <Switch
                id="create-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label htmlFor="create-active">Active</Label>
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

      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit store</DialogTitle>
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
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
              <div className="grid gap-2 border-t pt-4">
                <Label>Link ingredients to this store</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search by name or category…"
                    value={editIngredientSearch}
                    onChange={(e) => setEditIngredientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[240px] overflow-y-auto rounded-md border bg-slate-50">
                  {editIngredientsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="size-6" />
                    </div>
                  ) : filteredEditIngredients.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      {editIngredients.length === 0
                        ? "No ingredients in the database."
                        : "No ingredients match your search."}
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-200">
                      {filteredEditIngredients.map((ing) => {
                        const selected = selectedIngredientIds.has(ing._id);
                        const otherStore = ing.storeId && ing.storeId !== editing?._id;
                        return (
                          <li key={ing._id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-none"
                              onClick={() => {
                                setSelectedIngredientIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(ing._id)) next.delete(ing._id);
                                  else next.add(ing._id);
                                  return next;
                                });
                              }}
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
                              {otherStore && ing.storeName && (
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This cannot be undone. Ingredients linked to this store will keep
              the reference but the store will no longer appear in lists.
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
