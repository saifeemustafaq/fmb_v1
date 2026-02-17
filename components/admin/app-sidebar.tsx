"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, UtensilsCrossed, Store, Users, FileDown, ShoppingCart, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function NavLink({
  href,
  isActive,
  tooltip,
  icon: Icon,
  children,
}: {
  href: string;
  isActive: boolean;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const { setOpenMobile, setOpen } = useSidebar();

  const collapseSidebar = () => {
    setOpenMobile(false);
    setOpen(false);
  };

  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={tooltip}>
      <Link href={href} onClick={collapseSidebar}>
        <Icon className="size-4" />
        <span>{children}</span>
      </Link>
    </SidebarMenuButton>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile, setOpen } = useSidebar();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setOpenMobile(false);
      setOpen(false);
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-2 text-sm font-semibold text-sidebar-foreground">
          Admin
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <NavLink
                href="/admin"
                isActive={pathname === "/admin"}
                tooltip="Home"
                icon={Home}
              >
                Home
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink
                href="/admin/ingredients"
                isActive={pathname === "/admin/ingredients"}
                tooltip="Ingredients"
                icon={UtensilsCrossed}
              >
                Ingredients
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink
                href="/admin/stores"
                isActive={pathname === "/admin/stores"}
                tooltip="Stores"
                icon={Store}
              >
                Stores
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink
                href="/admin/users"
                isActive={pathname === "/admin/users" || pathname?.startsWith("/admin/users/")}
                tooltip="Users"
                icon={Users}
              >
                Users
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink
                href="/admin/carts"
                isActive={pathname === "/admin/carts" || pathname?.startsWith("/admin/carts/")}
                tooltip="Carts"
                icon={ShoppingCart}
              >
                Carts
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink
                href="/admin/import-export"
                isActive={pathname === "/admin/import-export" || pathname?.startsWith("/admin/import-export")}
                tooltip="Import and Export"
                icon={FileDown}
              >
                Import and Export
              </NavLink>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log out" onClick={handleLogout} className="w-full">
              <LogOut className="size-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
