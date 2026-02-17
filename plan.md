# Admin Sidebar and Ingredients Route (Implemented)

## Where the sidebar code lives

- **Admin layout:** `app/admin/layout.tsx` — Wraps all `/admin/*` routes with `SidebarProvider`, `AppSidebar`, and main content (`SidebarInset` with `SidebarTrigger` + children). Only admin routes see the sidebar.
- **Sidebar UI:** `components/admin/app-sidebar.tsx` — Admin-only sidebar with nav: **Home** → `/admin`, **Ingredients** → `/admin/ingredients`. Uses Shadcn `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` and `lucide-react` icons.
- **Ingredients page:** `app/admin/ingredients/page.tsx` — Placeholder page at `/admin/ingredients`; can later list/approve ingredients via existing APIs.

## Routing

- **Home** (sidebar) → `/admin` → `app/admin/page.tsx` (dashboard).
- **Ingredients** (sidebar) → `/admin/ingredients` → `app/admin/ingredients/page.tsx`.

No changes to middleware or API routes; `/admin` and `/admin/ingredients` stay under the existing protected admin prefix.

## File summary

| File | Purpose |
|------|--------|
| `app/admin/layout.tsx` | SidebarProvider + AppSidebar + SidebarInset (header with SidebarTrigger + children). |
| `components/admin/app-sidebar.tsx` | Admin sidebar: Home, Ingredients. |
| `app/admin/ingredients/page.tsx` | Ingredients page at `/admin/ingredients`. |

Shadcn sidebar primitives remain in `components/ui/sidebar.tsx`; middleware unchanged.
