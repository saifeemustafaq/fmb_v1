/**
 * Generate print-friendly HTML for a combined shopping list.
 * Can be used for browser print (Save as PDF) or future server-side PDF (e.g. Playwright).
 */

export type CombinedItemForPdf = {
  nameSnapshot: string;
  categorySnapshot: string;
  quantityRequested: number;
  unit: string;
  quantityToBuy?: number | null;
  storeIdSnapshot?: string | null;
};

export type CombinedPdfInput = {
  weekPlanId: string;
  weekLabel: string;
  items: CombinedItemForPdf[];
  generatedAt: string;
};

/**
 * Group items by category for display
 */
export function groupItemsByCategory(
  items: CombinedItemForPdf[]
): Map<string, CombinedItemForPdf[]> {
  const map = new Map<string, CombinedItemForPdf[]>();
  for (const item of items) {
    const cat = item.categorySnapshot || "Other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return map;
}

/**
 * Generate HTML string for the combined shopping list (print-friendly)
 */
export function generateCombinedCartHtml(input: CombinedPdfInput): string {
  const grouped = groupItemsByCategory(input.items);
  const categories = [...grouped.keys()].sort();

  const rows = categories.flatMap((category) => {
    const list = grouped.get(category)!;
    const header = `<tr><th colspan="3" style="text-align:left;padding:8px 0 4px;border-bottom:1px solid #e2e8f0;font-size:14px;">${escapeHtml(category)}</th></tr>`;
    const itemRows = list
      .map(
        (item) =>
          `<tr><td style="padding:4px 0;">${escapeHtml(item.nameSnapshot)}</td><td style="padding:4px 0;text-align:right;">${item.quantityRequested} ${escapeHtml(item.unit)}</td><td style="padding:4px 0;"></td></tr>`
      )
      .join("");
    return header + itemRows;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Combined Shopping List - ${escapeHtml(input.weekLabel)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 24px auto; padding: 16px; font-size: 16px; color: #1e293b; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    @media print { body { margin: 12px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button type="button" onclick="window.print()" style="padding:10px 20px;font-size:16px;cursor:pointer;background:#0f172a;color:white;border:none;border-radius:6px;">Print / Save as PDF</button>
  </div>
  <h1>Combined Shopping List</h1>
  <p class="meta">${escapeHtml(input.weekLabel)} · Generated ${input.generatedAt}</p>
  <table>
    ${rows.join("")}
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
