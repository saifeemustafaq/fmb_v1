import { CookShell } from "@/components/cook/cook-shell";

export default function CookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CookShell>{children}</CookShell>;
}
