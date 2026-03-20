"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const DAY_TYPES = [
  { value: "no_thali", label: "No thali" },
  { value: "thali", label: "Thali" },
  { value: "jamaat_wide_thali", label: "Jamaat wide thali" },
  { value: "miqaat", label: "Miqaat" },
] as const;

type Cook = { _id: string; name: string; role: string };
type DayForm = {
  date: string;
  dayType: (typeof DAY_TYPES)[number]["value"];
  headcount: number;
  menuItems: string;
  assignedCookId: string;
};

function getWeekDates(mondayStr: string): string[] {
  const m = new Date(mondayStr + "T12:00:00");
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(m);
    d.setDate(m.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function normalizeToMondayDateString(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + toMonday);
  return d.toISOString().slice(0, 10);
}

function NewWeekPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSingleDay = searchParams.get("single") === "1";

  const [cooks, setCooks] = useState<Cook[]>([]);
  const [defaultCookId, setDefaultCookId] = useState<string>("");
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [singleDate, setSingleDate] = useState<string>("");
  const [days, setDays] = useState<DayForm[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCooks = async () => {
      try {
        const res = await fetch("/api/admin/users?role=cook");
        if (!res.ok) throw new Error("Failed to fetch cooks");
        const data = await res.json();
        const list = (data.users ?? []).filter((u: Cook) => u.role === "cook");
        setCooks(list);
        if (list.length > 0 && !defaultCookId) setDefaultCookId(list[0]._id);
      } catch (err) {
        console.error(err);
        setError("Failed to load cooks.");
      }
    };
    fetchCooks();
  }, []);

  useEffect(() => {
    if (isSingleDay) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);
      setSingleDate(dateStr);
      setDays([
        {
          date: dateStr,
          dayType: "thali",
          headcount: 0,
          menuItems: "",
          assignedCookId: defaultCookId || "",
        },
      ]);
    } else {
      const nextMonday = new Date();
      const day = nextMonday.getDay();
      const toMonday = day === 0 ? -6 : 1 - day;
      nextMonday.setDate(nextMonday.getDate() + toMonday);
      const mondayStr = nextMonday.toISOString().slice(0, 10);
      setWeekStartDate(mondayStr);
      const dates = getWeekDates(mondayStr);
      setDays(
        dates.map((date) => ({
          date,
          dayType: "no_thali" as const,
          headcount: 0,
          menuItems: "",
          assignedCookId: defaultCookId || "",
        }))
      );
    }
  }, [isSingleDay]);

  useEffect(() => {
    if (defaultCookId && days.length > 0) {
      setDays((prev) =>
        prev.map((d) => ({ ...d, assignedCookId: defaultCookId }))
      );
    }
  }, [defaultCookId]);

  useEffect(() => {
    if (isSingleDay && singleDate && days.length === 1) {
      setDays((prev) => [{ ...prev[0], date: singleDate }]);
    }
  }, [singleDate, isSingleDay]);

  useEffect(() => {
    if (!isSingleDay && weekStartDate) {
      const dates = getWeekDates(weekStartDate);
      setDays((prev) =>
        prev.length === 7
          ? prev.map((d, i) => ({ ...d, date: dates[i] ?? d.date }))
          : dates.map((date) => ({
              date,
              dayType: "no_thali" as const,
              headcount: 0,
              menuItems: "",
              assignedCookId: defaultCookId || "",
            }))
      );
    }
  }, [weekStartDate, isSingleDay]);

  const updateDay = (index: number, updates: Partial<DayForm>) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!defaultCookId) {
      setError("Please select a default cook.");
      return;
    }
    const payload = {
      weekStartDate: isSingleDay ? singleDate : weekStartDate,
      assignedCookId: defaultCookId,
      name: name.trim() ? name.trim() : undefined,
      days: days.map((d) => ({
        date: d.date,
        dayType: d.dayType,
        headcount: d.headcount,
        menuItems: d.menuItems
          ? d.menuItems.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        assignedCookId: d.assignedCookId && d.assignedCookId !== defaultCookId ? d.assignedCookId : undefined,
      })),
      notes: notes || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/week-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create week plan");
      }
      const data = await res.json();
      router.push(`/admin/week-plans/${data.weekPlanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayTypeLabel: Record<string, string> = {
    no_thali: "No thali",
    thali: "Thali",
    jamaat_wide_thali: "Jamaat wide thali",
    miqaat: "Miqaat",
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/week-plans" className="h-12 w-12">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isSingleDay ? "Create Single-Day Plan" : "Create Week Plan"}
            </h1>
            <p className="text-sm text-slate-600">
              {isSingleDay
                ? "One date, one cook, one cart"
                : "Set day types and assign cooks for the week"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan details</CardTitle>
              <CardDescription>
                {isSingleDay ? "Pick date and default cook" : "Pick week start (Monday) and default cook"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSingleDay ? (
                <div className="space-y-2">
                  <Label htmlFor="singleDate">Date</Label>
                  <Input
                    id="singleDate"
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="weekStart">Week start (Monday)</Label>
                  <Input
                    id="weekStart"
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setWeekStartDate(value ? normalizeToMondayDateString(value) : "");
                    }}
                    className="h-12 text-base"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="planName">Plan name (optional)</Label>
                <Input
                  id="planName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={weekStartDate ? `Week of ${new Date(weekStartDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Week of ..."}
                  className="h-12 text-base"
                />
                <p className="text-xs text-slate-500">
                  Leave empty to use default name: Week of Monday.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Default cook</Label>
                <Select value={defaultCookId} onValueChange={setDefaultCookId} required>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select cook" />
                  </SelectTrigger>
                  <SelectContent>
                    {cooks.map((c) => (
                      <SelectItem key={c._id} value={c._id} className="text-base">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Days</CardTitle>
              <CardDescription>
                Set day type, headcount, menu items; override cook per day if needed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {days.map((day, index) => (
                <div
                  key={day.date}
                  className="rounded-lg border border-slate-200 bg-white p-4 space-y-4"
                >
                  <div className="font-medium text-slate-900">
                    {isSingleDay
                      ? "Single day"
                      : new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Day type</Label>
                      <Select
                        value={day.dayType}
                        onValueChange={(v) =>
                          updateDay(index, { dayType: v as DayForm["dayType"] })
                        }
                      >
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_TYPES.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-base">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {day.dayType !== "no_thali" && (
                      <div className="space-y-2">
                        <Label>Headcount</Label>
                        <Input
                          type="number"
                          min={0}
                          value={day.headcount}
                          onChange={(e) =>
                            updateDay(index, { headcount: parseInt(e.target.value, 10) || 0 })
                          }
                          className="h-12 text-base"
                        />
                      </div>
                    )}
                  </div>
                  {day.dayType !== "no_thali" && (
                    <div className="space-y-2">
                      <Label>Menu items (comma-separated)</Label>
                      <Input
                        value={day.menuItems}
                        onChange={(e) => updateDay(index, { menuItems: e.target.value })}
                        placeholder="e.g. Poha, Dal, Rice"
                        className="h-12 text-base"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Cook for this day</Label>
                    <Select
                      value={day.assignedCookId || defaultCookId}
                      onValueChange={(v) => updateDay(index, { assignedCookId: v })}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cooks.map((c) => (
                          <SelectItem key={c._id} value={c._id} className="text-base">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this plan"
                className="min-h-[80px] text-base"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              size="lg"
              className="h-14 flex-1 text-base font-medium"
              disabled={isSubmitting || cooks.length === 0}
            >
              {isSubmitting ? "Creating…" : "Create plan"}
            </Button>
            <Button type="button" variant="outline" size="lg" asChild className="h-14">
              <Link href="/admin/week-plans">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function NewWeekPlanPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <Spinner className="h-8 w-8" />
        </main>
      }
    >
      <NewWeekPlanContent />
    </Suspense>
  );
}
