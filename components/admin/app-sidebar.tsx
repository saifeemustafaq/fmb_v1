"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
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
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
