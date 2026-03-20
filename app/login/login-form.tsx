"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";

const roleRedirect: Record<string, string> = {
  admin: "/admin",
  cook: "/cook",
  volunteer: "/volunteer",
};

export type DemoHint = {
  its: string;
  password: string;
};

function LoginFormInner({ demoHint }: { demoHint: DemoHint | null }) {
  const router = useRouter();

  const [its, setIts] = useState(demoHint?.its ?? "");
  const [password, setPassword] = useState(demoHint?.password ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          its: Number.parseInt(its, 10),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Login failed");
        setLoading(false);
        return;
      }

      const role = data?.user?.role as string | undefined;
      const redirectTo = role ? roleRedirect[role] : "/";
      router.replace(redirectTo || "/");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your ITS number and password.
        </p>

        {demoHint ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Try the demo</p>
            <p className="mt-1 text-amber-900/90">
              ITS: <span className="font-mono tabular-nums">{demoHint.its}</span>
              {" · "}
              Password: <span className="font-mono">{demoHint.password}</span>
            </p>
            <p className="mt-2 text-xs text-amber-900/80">
              Shared sandbox data; it can reset on a schedule and does not affect
              production.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="its" className="block text-sm font-medium">
              ITS Number
            </label>
            <input
              id="its"
              name="its"
              inputMode="numeric"
              pattern="[0-9]*"
              value={its}
              onChange={(event) => setIts(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-base focus:border-slate-500 focus:outline-none"
              placeholder="Enter ITS"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-base focus:border-slate-500 focus:outline-none"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

export function LoginForm({ demoHint }: { demoHint: DemoHint | null }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginFormInner demoHint={demoHint} />
    </Suspense>
  );
}
