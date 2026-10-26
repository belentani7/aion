import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLoginConfiguration, startLogin } from "@/const";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { formatDate, localizeEventType, type Language } from "@/i18n";
import { redactAuditPayload } from "@/lib/auditDisplay";

export type AuditEventFixture = {
  id: number;
  eventType: string;
  createdAt: string | Date;
  previousHash: string | null;
  currentHash: string;
  payload: unknown;
};

type Translate = (key: string) => string;

/** Safe, locale-aware audit-event preview used by the dashboard and its smoke tests. */
export function AuditEventTechnicalPreview({ event, t, language }: {
  event: AuditEventFixture;
  t: Translate;
  language: Language;
}) {
  const safePayload = redactAuditPayload(event.payload, t("payloadRedacted"));
  return (
    <article data-testid="audit-event-preview" className="rounded-xl border border-border/70 bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{localizeEventType(event.eventType, language)}</h2>
          <time className="mt-1 block text-xs text-muted-foreground" dateTime={new Date(event.createdAt).toISOString()}>
            {formatDate(new Date(event.createdAt), language)}
          </time>
        </div>
        <span className="rounded-md border px-2 py-1 font-mono text-xs">{event.currentHash.slice(0, 12)}</span>
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 text-xs">
        {JSON.stringify(safePayload, null, 2)}
      </pre>
    </article>
  );
}
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginConfigured = getLoginConfiguration() !== null;
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle><h1>AION</h1></CardTitle>
            <CardDescription>
              Autonomous Intelligence Orchestration Network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled={!loginConfigured} aria-describedby={!loginConfigured ? "login-status" : undefined} onClick={() => startLogin()}>
              Sign in
            </Button>
            {!loginConfigured && <p id="login-status" role="status" className="mt-4 text-sm text-foreground">Sign-in is not configured in this environment. No account or provider access is enabled.</p>}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AION Core</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {user?.name || user?.email || "user"}
            </p>
          </div>
          <Button variant="outline" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              The fullstack scaffold is up and running.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              React 19 + Vite + tRPC + Drizzle is wired end to end. Use the
              component showcase route to review the available UI primitives.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Validation catalogue</CardTitle>
            <CardDescription>Inspect PVC-U risk profiles and registered public data sources. Their operational status is not independently verified.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/validation"><ShieldCheck aria-hidden="true" className="mr-2 h-4 w-4" /> Open validation catalogue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
