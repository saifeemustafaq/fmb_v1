"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, History, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function CookShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cookName, setCookName] = useState("Cook");
  const [cookRole, setCookRole] = useState("Cook");

  const isDashboard = pathname === "/cook" || pathname === "/cook/";
  const isHistory = pathname === "/cook/history";

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
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={handleBack}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
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

      {/* Bottom nav - 48px+ touch targets */}
      <nav
        className="flex shrink-0 border-t border-slate-200 bg-white"
        aria-label="Cook navigation"
      >
        <Link
          href="/cook"
          className={cn(
            "flex min-h-[48px] flex-1 items-center justify-center gap-2 text-base font-medium transition-colors",
            isDashboard
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
          aria-current={isDashboard ? "page" : undefined}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/cook/history"
          className={cn(
            "flex min-h-[48px] flex-1 items-center justify-center gap-2 text-base font-medium transition-colors",
            isHistory
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
          aria-current={isHistory ? "page" : undefined}
        >
          <History className="h-5 w-5 shrink-0" aria-hidden />
          <span>History</span>
        </Link>
      </nav>
    </div>
  );
}
