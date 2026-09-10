import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getScan } from "@/lib/scan.functions";
import type { CheckStatus } from "@/lib/scan.functions";

export const Route = createFileRoute("/report/$id")({
  loader: async ({ params }) => {
    try {
      return { scan: await getScan({ data: { id: params.id } }) };
    } catch {
      return { scan: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Your ShipCheck report" },
      { name: "description", content: "Your pre-launch score and the issues found on your site." },
      { property: "og:title", content: "Your ShipCheck report" },
      { property: "og:description", content: "Your pre-launch score and the issues found on your site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Report,
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
});

const scoreColor = (score: number) =>
  score >= 80 ? "text-pass" : score >= 50 ? "text-warn" : "text-destructive";

const dot: Record<CheckStatus, string> = {
  pass: "bg-pass",
  warning: "bg-warn",
  critical: "bg-destructive",
};

function Missing() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">We couldn't find that report</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The link may be mistyped. Run a new scan to get a fresh report.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          New scan
        </Link>
      </div>
    </main>
  );
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="h-9 rounded-lg border border-border bg-card px-4 font-mono text-xs text-foreground transition hover:border-primary"
    >
      {copied ? "link copied" : "copy report link"}
    </button>
  );
}

function Report() {
  const { scan } = Route.useLoaderData();

  if (!scan) return <Missing />;

  const ranked = [...scan.checks].sort((a, b) => {
    const order = { critical: 0, warning: 1, pass: 2 } as const;
    return order[a.status] - order[b.status] || b.weight - a.weight;
  });
  const issues = ranked.filter((c) => c.status !== "pass");
  const top = issues.slice(0, 3);
  const locked = scan.checks.length - top.length;
  const criticals = scan.checks.filter((c) => c.status === "critical").length;
  const warnings = scan.checks.filter((c) => c.status === "warning").length;
  const passes = scan.checks.filter((c) => c.status === "pass").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <Link to="/" className="font-mono text-sm font-bold tracking-tight">
          ship<span className="text-primary">check</span>
        </Link>
        <div className="flex items-center gap-3">
          <CopyLink />
          <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">
            new scan
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-xl border border-border bg-card p-8 shadow-card">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Report for
          </p>
          <p className="mt-2 break-all font-mono text-sm">{scan.url}</p>
          <div className="mt-6 flex items-end gap-5">
            <span className={`font-mono text-7xl font-bold leading-none ${scoreColor(scan.score)}`}>
              {scan.score}
            </span>
            <span className="pb-2 font-mono text-sm text-muted-foreground">/ 100</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {criticals} critical · {warnings} warnings · {passes} passed
          </p>
        </div>

        {scan.paid ? (
          <>
            <h2 className="mt-12 text-lg font-semibold tracking-tight">Full report</h2>
            <ul className="mt-4 space-y-3">
              {ranked.map((c) => (
                <li key={c.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot[c.status]}`} />
                    <span className="text-sm font-semibold">{c.name}</span>
                    <span className="ml-auto font-mono text-xs uppercase text-muted-foreground">
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{c.detail}</p>
                  {c.fix ? (
                    <p className="mt-3 border-l-2 border-primary pl-3 text-sm">
                      <span className="font-mono text-xs uppercase tracking-wider text-primary">
                        fix
                      </span>
                      <br />
                      {c.fix}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="mt-12 text-lg font-semibold tracking-tight">
              {top.length > 0 ? "Top issues" : "Nothing critical found"}
            </h2>
            <ul className="mt-4 space-y-2">
              {top.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-4 text-sm"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot[c.status]}`} />
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-auto font-mono text-xs uppercase text-muted-foreground">
                    {c.status}
                  </span>
                </li>
              ))}
              {top.length === 0 ? (
                <li className="rounded-lg border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                  Every check passed on this page.
                </li>
              ) : null}
            </ul>

            <div className="relative mt-10 overflow-hidden rounded-xl border border-border bg-card">
              <div className="space-y-3 p-6 blur-[5px]" aria-hidden="true">
                {ranked.slice(top.length).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className={`h-2 w-2 rounded-full ${dot[c.status]}`} />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">— {c.detail.slice(0, 48)}…</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/70 text-center">
                <p className="text-sm font-semibold">{locked} more issues — unlock full report</p>
                <p className="max-w-sm px-6 text-sm text-muted-foreground">
                  Full detail, exact fix instructions for every failure, a PDF and a shareable link.
                </p>
                <button
                  disabled
                  className="h-11 cursor-not-allowed rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground opacity-60"
                >
                  Unlock full report — $9
                </button>
                <span className="font-mono text-xs text-muted-foreground">payments coming soon</span>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
