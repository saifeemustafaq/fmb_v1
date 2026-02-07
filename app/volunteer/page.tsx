import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function VolunteerDashboard() {
  // TODO: Fetch assigned shopping lists from API
  const hasActiveList = false; // Will be dynamic

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Volunteer Dashboard
          </h1>
          <p className="mt-2 text-base text-slate-600">
            View and download approved shopping lists
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Active Shopping List */}
          {hasActiveList ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  This Week&apos;s Shopping List
                  <Badge className="ml-3 text-sm" variant="default">
                    Ready
                  </Badge>
                </CardTitle>
                <CardDescription className="text-base">
                  Week of Feb 10 - Feb 16, 2026
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* List Summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Items</span>
                      <span className="text-slate-900">45</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Estimated Cost</span>
                      <span className="text-slate-900">$320</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Cook</span>
                      <span className="text-slate-900">Fatema Bhen</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-14 w-full text-base font-medium"
                  >
                    <Link href="/volunteer/shopping-list/current">
                      View Shopping List
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-14 w-full text-base font-medium"
                  >
                    <Link href="/volunteer/shopping-list/current/pdf">
                      Download PDF
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  No Active Shopping List
                </CardTitle>
                <CardDescription className="text-base">
                  Wait for admin to finalize this week&apos;s cart
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-base text-slate-600">
                    You don&apos;t have an assigned shopping list yet. The admin
                    will notify you when it&apos;s ready.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous Lists */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Previous Shopping Lists</CardTitle>
              <CardDescription className="text-base">
                View past lists and receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 w-full text-base font-medium"
              >
                <Link href="/volunteer/history">View History</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Store Locations */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-xl text-green-900">
                Store Locations
              </CardTitle>
              <CardDescription className="text-base text-green-700">
                Where to shop for each ingredient category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-green-900">
                <div className="flex justify-between">
                  <span className="font-medium">Fresh Produce</span>
                  <span>Local Farmer&apos;s Market</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Spices</span>
                  <span>Indian Market</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Dry Goods</span>
                  <span>Whole Foods</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">General Items</span>
                  <span>General Grocery</span>
                </div>
              </div>
              <Button
                asChild
                variant="link"
                className="mt-4 h-auto p-0 text-green-800"
              >
                <Link href="/volunteer/stores">View All Stores →</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-xl text-blue-900">
                Shopping Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Check the shopping list before leaving home</li>
                <li>• Items are grouped by store for easy shopping</li>
                <li>• Keep receipts for reimbursement</li>
                <li>• Call admin if you have questions about quantities</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
