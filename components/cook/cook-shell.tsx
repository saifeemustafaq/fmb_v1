"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Pencil, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavFooter } from "@/components/shared/nav-footer";
import { CookHomeFooterProvider, useCookHomeFooterRef } from "@/components/cook/cook-home-footer-context";

function CookFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const homeFooterContext = useCookHomeFooterRef();
  const isEditCartPage = pathname?.match(/^\/cook\/cart\/[^/]+\/edit$/);
  const isHome = pathname === "/cook" || pathname === "/cook/";

  if (isEditCartPage) return null;

  if (isHome && homeFooterContext) {
    const { homeFooter: data } = homeFooterContext;
    const hasCart = data.cartId != null;
    const cartId = hasCart ? String(data.cartId) : null;
    return (
      <footer className="grid shrink-0 grid-cols-2 gap-2 border-t bg-background px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <Button
            variant="outline"
            size="default"
            className="h-12 w-full gap-2 text-base bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background disabled:opacity-50"
            disabled={!hasCart}
            onClick={() => data.openViewCartSheet()}
          >
            <ShoppingCart className="h-5 w-5 shrink-0" />
            View Cart
          </Button>
        </div>
        <div className="min-w-0">
          <Button
            variant="outline"
            size="default"
            className="h-12 w-full gap-2 text-base bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background disabled:opacity-50"
            disabled={!hasCart}
            onClick={() => cartId && router.push(`/cook/cart/${cartId}/edit`)}
          >
            <Pencil className="h-5 w-5 shrink-0" />
            Edit Cart
          </Button>
        </div>
      </footer>
    );
  }

  return <NavFooter homePath="/cook" />;
}

export function CookShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cookName, setCookName] = useState("Cook");
  const [cookRole, setCookRole] = useState("Cook");

  const isEditCartPage = pathname?.match(/^\/cook\/cart\/[^/]+\/edit$/);

  useEffect(() => {
    const loadCookName = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        const name = data?.user?.name;
        if (typeof name === "string" && name.trim()) {
          setCookName(name.trim());
          setCookRole(data?.user?.role?.trim() || "Cook");
        }
      } catch {
        setCookRole("Cook");
      }
    };

    loadCookName();
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/cook");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <CookHomeFooterProvider>
      <div className="flex h-svh flex-col bg-white text-slate-900">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={handleBack}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-slate-600 text-white hover:bg-slate-900 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate px-3 text-base font-semibold text-slate-900">
            {cookName} <span className="text-sm text-slate-600 border border-slate-200 rounded-md px-2">{cookRole}</span>
          </h1>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Main content - page provides its own <main> where needed */}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>

        {/* Footer: on home = View Cart | Edit Cart; elsewhere = Back | Home */}
        {!isEditCartPage && <CookFooter />}
      </div>
    </CookHomeFooterProvider>
  );
}
