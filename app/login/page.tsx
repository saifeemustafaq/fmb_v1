import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

function parseDemoHint(): { its: string; password: string } | null {
  if (process.env.DEMO_HIDE_LOGIN_HINT === "true") {
    return null;
  }

  const itsRaw = process.env.DEMO_ITS?.trim();
  const password = process.env.DEMO_PASSWORD;
  if (!itsRaw || !password) {
    return null;
  }

  const itsNum = Number.parseInt(itsRaw, 10);
  if (!Number.isFinite(itsNum) || itsNum <= 0) {
    return null;
  }

  return { its: String(itsNum), password };
}

export default function LoginPage() {
  const demoHint = parseDemoHint();

  return <LoginForm demoHint={demoHint} />;
}
