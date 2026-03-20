import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminFooter } from "@/components/admin/admin-footer";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-svh flex-col">
        <header className="flex min-h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <SidebarTrigger />
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        <AdminFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
