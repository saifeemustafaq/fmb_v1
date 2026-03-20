"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { CartItemsList } from "@/components/admin/cart-items-list";
import { INGREDIENT_CATEGORIES } from "@/lib/constants/ingredient-categories";
import { FileText, Download, Pencil, StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Store = { _id: string; name: string };

type CartItem = {
  _id: string;
  nameSnapshot: string;
  categorySnapshot: string;
  storeIdSnapshot: string | null;
  quantityRequested: number;
  unit: string;
};

type Cart = {
  _id: string;
  weekPlanId: string;
  cookId: string;
  cookName?: string;
  weekLabel?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CartDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartId: string | null;
};

function buildCsv(items: CartItem[], storeNameById: Map<string, string>): string {
  const header = "Name,Category,Store,Quantity,Unit";
  const rows = items.map((item) => {
    const storeName = item.storeIdSnapshot
      ? storeNameById.get(item.storeIdSnapshot) ?? item.storeIdSnapshot
      : "";
    const name = `"${(item.nameSnapshot ?? "").replace(/"/g, '""')}"`;
    const category = `"${(item.categorySnapshot ?? "").replace(/"/g, '""')}"`;
    const store = `"${storeName.replace(/"/g, '""')}"`;
    return [name, category, store, item.quantityRequested, item.unit].join(",");
  });
  return [header, ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CartDetailModal({
  open,
  onOpenChange,
  cartId,
}: CartDetailModalProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<Record<string, string>>({});
  const [editStore, setEditStore] = useState<Record<string, string>>({});
  const [editQuantity, setEditQuantity] = useState<Record<string, number>>({});
  const [editUnit, setEditUnit] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!cartId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/carts/${cartId}`);
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      setCart(data.cart);
      setItems(data.items ?? []);
      setEditCategory({});
      setEditStore({});
      setEditQuantity({});
      setEditUnit({});
    } catch (err) {
      console.error(err);
      setCart(null);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [cartId]);

  useEffect(() => {
    if (open && cartId) {
      fetchCart();
    }
  }, [open, cartId, fetchCart]);

  useEffect(() => {
    if (cart) setNoteDraft(cart.notes ?? "");
  }, [cart]);

  useEffect(() => {
    if (open) {
      fetch("/api/admin/stores")
        .then((res) => (res.ok ? res.json() : { stores: [] }))
        .then((data) => setStores(data.stores ?? []))
        .catch(() => setStores([]));
    }
  }, [open]);

  const storeNameById = new Map(stores.map((s) => [s._id, s.name]));

  const handleStatusChange = async (newStatus: "submitted" | "finalized") => {
    if (!cartId) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/carts/${cartId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCart((c) => (c ? { ...c, status: newStatus } : null));
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!cartId) return;
    setSavingEdit(true);
    try {
      const toUpdate = items.filter(
        (item) =>
          editCategory[item._id] !== undefined ||
          editStore[item._id] !== undefined ||
          editQuantity[item._id] !== undefined ||
          editUnit[item._id] !== undefined
      );
      for (const item of toUpdate) {
        const body: {
          categorySnapshot?: string;
          storeIdSnapshot?: string | null;
          quantity?: number;
          unit?: string;
        } = {};
        if (editCategory[item._id] !== undefined)
          body.categorySnapshot = editCategory[item._id];
        if (editStore[item._id] !== undefined)
          body.storeIdSnapshot = editStore[item._id] || null;
        if (editQuantity[item._id] !== undefined)
          body.quantity = editQuantity[item._id];
        if (editUnit[item._id] !== undefined)
          body.unit = editUnit[item._id];
        if (Object.keys(body).length === 0) continue;
        await fetch(`/api/carts/${cartId}/items/${item._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      await fetchCart();
      setIsEditing(false);
      setEditCategory({});
      setEditStore({});
      setEditQuantity({});
      setEditUnit({});
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownloadCsv = () => {
    const csv = buildCsv(items, storeNameById);
    const label = cart?.weekLabel?.replace(/\s+/g, "-") ?? "cart";
    downloadCsv(csv, `cart-${label}-${cartId}.csv`);
  };

  const handleSaveNote = async () => {
    if (!cartId) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/carts/${cartId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteDraft.trim() || null }),
      });
      if (res.ok) {
        await fetchCart();
        setEditingNote(false);
      }
    } finally {
      setSavingNote(false);
    }
  };

  const displayItems = items.map((item) => ({
    nameSnapshot: item.nameSnapshot,
    quantityRequested: item.quantityRequested,
    unit: item.unit,
    categorySnapshot: item.categorySnapshot,
  }));

  const canSubmit = cart?.status === "draft";
  const canFinalize = cart?.status === "submitted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {cart ? `${cart.cookName ?? "Cook"}'s cart` : "Cart"}
          </DialogTitle>
          <DialogDescription>
            {cart?.weekLabel ?? "—"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        ) : !cart ? (
          <p className="text-sm text-slate-600">Failed to load cart.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Status:</span>
              <Badge
                variant={
                  cart.status === "submitted"
                    ? "default"
                    : cart.status === "finalized"
                      ? "secondary"
                      : "outline"
                }
              >
                {cart.status}
              </Badge>
              {(canSubmit || canFinalize) && (
                <>
                  {canSubmit && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange("submitted")}
                    >
                      Mark as Submitted
                    </Button>
                  )}
                  {canFinalize && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange("finalized")}
                    >
                      Mark as Finalized
                    </Button>
                  )}
                </>
              )}
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <StickyNote className="h-4 w-4" />
                Note
              </h4>
              {editingNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note for this cart…"
                    className="min-h-[80px] resize-y text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNote} disabled={savingNote}>
                      {savingNote ? "Saving…" : "Save note"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingNote(false);
                        setNoteDraft(cart?.notes ?? "");
                      }}
                      disabled={savingNote}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (cart?.notes ?? "").trim() ? (
                <div className="rounded border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {cart!.notes}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 text-slate-600"
                    onClick={() => setEditingNote(true)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit note
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingNote(true)}
                >
                  <StickyNote className="mr-2 h-4 w-4" />
                  Add note
                </Button>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800">Items</h4>
              {!isEditing ? (
                <CartItemsList
                  items={displayItems}
                  emptyMessage="No items in this cart."
                  itemKeyPrefix={cart._id}
                />
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item._id}
                      className="flex flex-col gap-2 rounded border border-slate-200 bg-slate-50/50 p-3 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {item.nameSnapshot}
                      </span>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="flex items-center gap-2">
                          <Label className="w-14 shrink-0 text-xs text-slate-500">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="h-8 w-20"
                            value={editQuantity[item._id] ?? item.quantityRequested}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!Number.isNaN(v) && v >= 1)
                                setEditQuantity((prev) => ({ ...prev, [item._id]: v }));
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-10 shrink-0 text-xs text-slate-500">Unit</Label>
                          <Input
                            type="text"
                            className="h-8 w-20"
                            placeholder="e.g. kg, pcs"
                            value={editUnit[item._id] ?? item.unit}
                            onChange={(e) =>
                              setEditUnit((prev) => ({ ...prev, [item._id]: e.target.value }))
                            }
                          />
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-2">
                          <Select
                            value={
                              editCategory[item._id] ?? item.categorySnapshot ?? ""
                            }
                            onValueChange={(v) =>
                              setEditCategory((prev) => ({ ...prev, [item._id]: v }))
                            }
                          >
                            <SelectTrigger className="h-8 w-full sm:w-[180px]">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {INGREDIENT_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={
                              editStore[item._id] ?? item.storeIdSnapshot ?? "__none__"
                            }
                            onValueChange={(v) =>
                              setEditStore((prev) => ({
                                ...prev,
                                [item._id]: v === "__none__" ? "" : v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 w-full sm:w-[140px]">
                              <SelectValue placeholder="Store" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {stores.map((s) => (
                                <SelectItem key={s._id} value={s._id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                disabled={items.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Download as CSV
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/carts/${cartId}/pdf`} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Download as PDF
                </Link>
              </Button>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit cart
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditCategory({});
                      setEditStore({});
                      setEditQuantity({});
                      setEditUnit({});
                    }}
                    disabled={savingEdit}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
