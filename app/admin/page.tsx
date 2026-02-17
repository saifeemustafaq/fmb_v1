import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllCartsForAdmin } from "@/lib/carts";

export default async function AdminDashboard() {
  let cartsPendingFinalization = 0;
  try {
    const carts = await getAllCartsForAdmin();
    cartsPendingFinalization = carts.filter((cart) => cart.status === "submitted").length;
  } catch (error) {
    console.error("Failed to load pending carts count:", error);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-base text-slate-600">
            Manage weekly plans, review carts, and approve ingredients
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {/* Week Planning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Week Planning</CardTitle>
              <CardDescription className="text-base">
                Create and manage weekly menu plans for cooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                size="lg"
                className="h-14 w-full text-base font-medium"
              >
                <Link href="/admin/week-plans/new">Create New Week Plan</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 w-full text-base font-medium"
              >
                <Link href="/admin/week-plans">View All Week Plans</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Cart Review */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Cart Review
                <Badge className="ml-3 text-sm" variant="default">
                  {cartsPendingFinalization} Pending
                </Badge>
              </CardTitle>
              <CardDescription className="text-base">
                Review and approve submitted ingredient carts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                size="lg"
                className="h-14 w-full text-base font-medium"
              >
                <Link href="/admin/carts">Review Carts</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pending Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Pending Ingredients
                <Badge className="ml-3 text-sm" variant="secondary">
                  5 New
                </Badge>
              </CardTitle>
              <CardDescription className="text-base">
                Approve or reject cook-submitted ingredients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 w-full text-base font-medium"
              >
                <Link href="/admin/pending-ingredients">
                  View Pending Ingredients
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* View as Other Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">View as Other Roles</CardTitle>
              <CardDescription className="text-base">
                See what cooks and volunteers see
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-14 w-full justify-start text-base font-medium"
              >
                <Link href="/cook">👨‍🍳 Cook View</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-14 w-full justify-start text-base font-medium"
              >
                <Link href="/volunteer">🧑‍🤝‍🧑 Volunteer View</Link>
              </Button>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="">
            <CardHeader>
              <CardTitle className="text-xl">User Management</CardTitle>
              <CardDescription className="text-base">
                Coming soon: Manage cooks and volunteers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-full text-base font-medium"
                asChild
              >
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
