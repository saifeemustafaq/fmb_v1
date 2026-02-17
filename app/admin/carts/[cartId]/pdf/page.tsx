"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

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
  cookName?: string;
  weekLabel?: string | null;
  status: string;
  notes?: string | null;
};

type Store = { _id: string; name: string };

export default function CartPdfPage() {
  const params = useParams();
  const cartId = params.cartId as string;

  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [groupBy, setGroupBy] = useState<"category" | "store">("category");
  const [includeNoteInPrint, setIncludeNoteInPrint] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!cartId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [cartRes, storesRes] = await Promise.all([
        fetch(`/api/carts/${cartId}`),
        fetch("/api/admin/stores"),
      ]);
      if (!cartRes.ok) throw new Error("Failed to fetch cart");
      const data = await cartRes.json();
      setCart(data.cart);
      setItems(data.items ?? []);
      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData.stores ?? []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load cart.");
    } finally {
      setIsLoading(false);
    }
  }, [cartId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (cart?.notes != null && (cart.notes ?? "").trim()) {
      setIncludeNoteInPrint(true);
    }
  }, [cart?.notes]);

  const handlePrint = () => {
    window.print();
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
        await fetchData();
        setAddingNote(false);
        setNoteDraft("");
      }
    } finally {
      setSavingNote(false);
    }
  };

  const storeNameById = new Map(stores.map((s) => [s._id, s.name]));

  const hasNote = (cart?.notes ?? "").trim().length > 0;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  if (error || !cart) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-red-600">{error ?? "Cart not found."}</p>
          <Button asChild className="mt-4 h-12">
            <Link href="/admin/carts">Back to Carts</Link>
          </Button>
        </div>
      </main>
    );
  }

  const title = cart.cookName ? `${cart.cookName}'s cart` : "Cart";

  const getStoreName = (storeId: string | null) =>
    storeId ? storeNameById.get(storeId) ?? "—" : "—";

  const byCategory = new Map<string, CartItem[]>();
  const byStore = new Map<string, CartItem[]>();
  for (const item of items) {
    const cat = item.categorySnapshot || "Other";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);

    const storeKey = item.storeIdSnapshot ?? "__none__";
    if (!byStore.has(storeKey)) byStore.set(storeKey, []);
    byStore.get(storeKey)!.push(item);
  }
  const categories = [...byCategory.keys()].sort();
  const storeKeys = [...byStore.keys()].sort((a, b) => {
    const nameA = a === "__none__" ? "No store" : getStoreName(a);
    const nameB = b === "__none__" ? "No store" : getStoreName(b);
    return nameA.localeCompare(nameB);
  });

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 print:bg-white print:py-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/carts" className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Group by</Label>
              <RadioGroup
                value={groupBy}
                onValueChange={(v) => setGroupBy(v as "category" | "store")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="category" id="pdf-cat" />
                  <Label htmlFor="pdf-cat" className="font-normal cursor-pointer">Category</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="store" id="pdf-store" />
                  <Label htmlFor="pdf-store" className="font-normal cursor-pointer">Store</Label>
                </div>
              </RadioGroup>
            </div>
            {!hasNote && (
              addingNote ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note for this cart…"
                    className="min-h-[72px] w-full max-w-sm resize-y text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNote} disabled={savingNote}>
                      {savingNote ? "Saving…" : "Save note"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setAddingNote(false); setNoteDraft(""); }}
                      disabled={savingNote}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingNote(true)}
                >
                  <StickyNote className="mr-2 h-4 w-4" />
                  Add note
                </Button>
              )
            )}
            <Button size="lg" className="h-12 px-6 w-fit" onClick={handlePrint}>
              Print / Save as PDF
            </Button>
          </div>
        </div>

        <div className="print:mb-0">
          <h1 className="text-xl font-bold text-slate-900 print:text-lg">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 print:text-xs">
            {cart.weekLabel ?? "—"} · Generated{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {groupBy === "store" && " · By store"}
            {groupBy === "category" && " · By category"}
          </p>
        </div>

        {hasNote && (
          <div
            className={`mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 ${includeNoteInPrint ? "" : "print:hidden"}`}
          >
            <div className="flex items-center justify-between gap-2 print:hidden">
              <p className="font-medium text-slate-600">Note</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-note"
                  checked={includeNoteInPrint}
                  onCheckedChange={(checked) => setIncludeNoteInPrint(checked === true)}
                />
                <Label htmlFor="include-note" className="cursor-pointer text-slate-600">
                  Include note in print
                </Label>
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap print:mt-0">{cart.notes}</p>
          </div>
        )}

        {items.length === 0 ? (
          <p className="mt-4 text-slate-600">No items in this cart.</p>
        ) : groupBy === "category" ? (
          <div className="mt-6 space-y-6 print:mt-4 print:space-y-4">
            {categories.map((category) => (
              <Card key={category} className="print:shadow-none print:border print:border-slate-200">
                <CardHeader className="pb-2 print:py-2">
                  <CardTitle className="text-base print:text-sm">
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 print:pt-0">
                  <ul className="space-y-2 print:space-y-1">
                    {byCategory.get(category)!.map((item) => (
                      <li
                        key={item._id}
                        className="flex justify-between text-sm print:text-base"
                      >
                        <span className="font-medium text-slate-800">
                          {item.nameSnapshot} ({getStoreName(item.storeIdSnapshot)})
                        </span>
                        <span className="text-slate-600">
                          {item.quantityRequested} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-6 print:mt-4 print:space-y-4">
            {storeKeys.map((key) => {
              const storeLabel = key === "__none__" ? "No store" : getStoreName(key);
              const storeItems = byStore.get(key)!;
              return (
                <Card key={key} className="print:shadow-none print:border print:border-slate-200">
                  <CardHeader className="pb-2 print:py-2">
                    <CardTitle className="text-base print:text-sm">
                      {storeLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 print:pt-0">
                    <ul className="space-y-2 print:space-y-1">
                      {storeItems.map((item) => (
                        <li
                          key={item._id}
                          className="flex justify-between text-sm print:text-base"
                        >
                          <span className="font-medium text-slate-800">
                            {item.nameSnapshot} ({item.categorySnapshot || "Other"})
                          </span>
                          <span className="text-slate-600">
                            {item.quantityRequested} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
