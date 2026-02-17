"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavFooterProps = {
  homePath: string;
};

export function NavFooter({ homePath }: NavFooterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === homePath;

  return (
    <footer className="grid shrink-0 grid-cols-2 gap-2 border-t bg-background px-3 py-3 sm:px-4">
      <div className="min-w-0">
        {!isHome ? (
          <Button
            variant="outline"
            size="default"
            onClick={() => router.back()}
            className="h-12 w-full gap-2 text-base bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            Back
          </Button>
        ) : (
          <div className="h-12 min-h-12" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <Button variant="outline" size="default" asChild className="h-12 w-full gap-2 text-base bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background">
          <Link href={homePath}>
            <Home className="h-5 w-5 shrink-0" />
            Home
          </Link>
        </Button>
      </div>
    </footer>
  );
}
