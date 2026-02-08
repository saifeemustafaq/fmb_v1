"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, ShoppingCart, FileText } from "lucide-react";

type CartListItem = {
  _id: string;
  weekPlanId: string;
  status: "draft" | "submitted" | "finalized";
  itemCount: number;
  weekStartDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function CookHistoryPage() {
  const router = useRouter();
  const [carts, setCarts] = useState<CartListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCarts = async () => {
      try {
        setIsLoading(true);
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        const res = await fetch("/api/carts");
        if (!res.ok) {
          setError("Failed to load cart history");
          return;
        }
        const data = await res.json();
        setCarts(data.carts ?? []);
      } catch (err) {
        console.error(err);
        setError("Failed to load cart history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarts();
  }, [router]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatWeekLabel = (weekStartDate: string | null) => {
    if (!weekStartDate) return "Unknown week";
    const d = new Date(weekStartDate);
    return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "submitted":
        return "default";
      case "finalized":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <Spinner className="h-8 w-8" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cook" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Cart History
            </h1>
            <p className="text-base text-slate-600">
              All your drafted and submitted carts
            </p>
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {carts.length === 0 && !error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                No carts yet
              </CardTitle>
              <CardDescription>
                Build a cart from your dashboard to see it here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full h-12">
                <Link href="/cook">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {carts.map((cart) => (
              <li key={cart._id}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <Link href={`/cook/cart/${cart._id}`} className="block">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5 text-slate-500" />
                          {formatWeekLabel(cart.weekStartDate)}
                        </CardTitle>
                        <Badge variant={statusVariant(cart.status)}>
                          {cart.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} · Updated {formatDate(cart.updatedAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <span className="text-sm font-medium text-primary hover:underline">
                        {cart.status === "draft" ? "Continue cart" : "View cart"} →
                      </span>
                    </CardContent>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <Button asChild variant="outline" size="lg" className="w-full h-12">
            <Link href="/cook">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
