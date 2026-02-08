"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

export type WeekMenuDay = {
  date: string;
  dayType: string;
  headcount: number;
  menuItems: string[];
  assignedCookId: string | null;
};

export interface WeekMenuSummaryProps {
  days: WeekMenuDay[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  compact?: boolean;
  className?: string;
}

function getDayName(dateString: string): string {
  return new Date(dateString + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
  });
}

/**
 * Simple collapsible: "This week you're cooking" with a list of days.
 * KISS – no card, no extra chrome.
 */
export function WeekMenuSummary({
  days,
  collapsible = true,
  defaultOpen = true,
  compact = false,
  className,
}: WeekMenuSummaryProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (days.length === 0) return null;

  const content = (
    <ul className="list-none space-y-2 pt-2">
      {days.map((day) => {
        const dayName = getDayName(day.date);
        const hasService = day.dayType !== "no_thali";
        const line = hasService
          ? `${day.headcount} people · ${day.menuItems.join(", ") || "—"}`
          : "No service";
        return (
          <li key={day.date} className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">{dayName}</span>
            {" · "}
            {line}
          </li>
        );
      })}
    </ul>
  );

  if (!collapsible) {
    return (
      <div className={className}>
        <p className="text-sm font-semibold text-slate-900">
          This week you&apos;re cooking
        </p>
        {content}
      </div>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={className}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50/80 px-3 py-2 text-left hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300">
        <span className="text-sm font-semibold text-slate-900">
          This week you&apos;re cooking
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-600" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="border border-t-0 border-slate-200 bg-white px-3 py-2 rounded-b">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
