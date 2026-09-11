import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { runScan, getScanCount, recoverReport } from "@/lib/scan.functions";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await getScanCount();
    } catch {
      return { total: 0 };
    }
  },
  head: () => ({
    meta: [
      { title: "ShipCheck — Fix your site before launch day" },
      {
        name: "description",
        content:
          "Launching on Product Hunt or IndieHackers? Paste your URL for an instant pre-launch score across 10 SEO, AI-visibility, technical and legal checks.",
      },
      { property: "og:title", content: "ShipCheck — Fix your site before launch day" },
      {
        property: "og:description",
        content:
          "Paste your URL and see what will hurt you on launch day: metadata, share previews, blocked crawlers, missing legal pages.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const steps = [
  {
    n: "01",
    title: "Paste your URL",
    body: "Any public page. No signup, no install, no script to add.",
  },
  {
    n: "02",
    title: "Ten checks, ten seconds",
    body: "We fetch your page the way Google, X and ChatGPT do, and report what they actually see.",
  },
  {
    n: "03",
    title: "Fix it before you post",
    body: "Every failure comes with the exact change to make. Ship the fix, then hit publish.",
  },
];

const stakes = [
  {
    title: "Your launch post gets one shot",
    body: "Product Hunt front page traffic arrives in a four-hour window and never comes back. A broken share card or a staging robots.txt turns that window into nothing.",
  },
  {
    title: "The link is the product",
    body: "On X, IndieHackers and outbids.lol, people see your link before your app. No preview image, no title, no click.",
  },
  {
    title: "AI answers are the new front page",
    body: "If GPTBot and ClaudeBot are blocked, you're absent from every 'best tool for…' answer for months.",
  },
];

function Index() {
  const navigate = useNavigate();
  const { total } = Route.useLoaderData();
  const scan = useServerFn(runScan);
  const recover = useServerFn(recoverReport);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recovery modal state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryUrl, setRecoveryUrl] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<{
    ok: boolean;
    message: string;
    directUrl?: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await scan({ data: { url } });
      if (result.alreadyUnlocked) {
        navigate({
          to: "/report/$id",
          params: { id: result.id },
          search: { alreadyUnlocked: "true" },
        });
      } else {
        navigate({ to: "/report/$id", params: { id: result.id } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onRecoverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recoveryUrl.trim() || !recoveryEmail.trim() || recoveryBusy) return;
    setRecoveryBusy(true);
    setRecoveryResult(null);
    try {
      const res = await recover({
        data: { url: recoveryUrl, email: recoveryEmail },
      });
      setRecoveryResult(res);
    } catch (err) {
      setRecoveryResult({
        ok: false,
        message: err instanceof Error ? err.message : "Failed to recover report. Try again.",
      });
    } finally {
      setRecoveryBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <span className="font-mono text-sm font-bold tracking-tight">
          ship<span className="text-primary">check</span>
        </span>
        <nav className="flex items-center gap-5 font-mono text-xs text-muted-foreground">
          <Link to="/about" className="transition hover:text-foreground">
            what we check
          </Link>
          <span>10 checks · instant</span>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-14 pb-24 text-center sm:pt-20">
        <p className="animate-rise font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Pre-launch site checker
        </p>
        <h1 className="animate-rise mt-7 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Paste your URL.
          <br />
          <span className="text-primary">Find out what will hurt you</span> before you launch.
        </h1>
        <p className="animate-rise mx-auto mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          You've spent weeks on the product and ten minutes on the page it lives at. ShipCheck sweeps
          the ten things that quietly sink launch day — missing metadata, dead share previews,
          blocked AI crawlers, absent legal pages — before Product Hunt sees them.
        </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-12 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourdomain.com"
            inputMode="url"
            aria-label="Website address"
            className="h-13 flex-1 rounded-lg border border-input bg-card px-4 font-mono text-sm text-foreground shadow-card outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-13 rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Scanning…" : "Scan my site"}
          </button>
        </form>
        {error ? <p className="mt-4 font-mono text-xs text-destructive">{error}</p> : null}

        {/* Small "Lost your report?" link near the main scan input */}
        <div className="mt-3 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setShowRecovery(true);
              setRecoveryResult(null);
            }}
            className="font-mono text-xs text-muted-foreground transition hover:text-foreground hover:underline"
          >
            Lost your report? Recover it here &rarr;
          </button>
        </div>

        <p className="mt-4 font-mono text-xs text-muted-foreground">
          Free score + your top 3 issues. Full report $9 once — no account, no subscription.
        </p>
        {total > 0 ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {total.toLocaleString("en-US")} {total === 1 ? "site" : "sites"} checked so far
          </p>
        ) : null}
      </section>

      {/* Report Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight">Recover your report</h3>
              <button
                type="button"
                onClick={() => setShowRecovery(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Enter the website URL and the email you used when unlocking your report. We'll send your direct link.
            </p>

            <form onSubmit={onRecoverSubmit} className="mt-5 space-y-3">
              <div>
                <label className="font-mono text-xs text-muted-foreground">Website address</label>
                <input
                  type="text"
                  value={recoveryUrl}
                  onChange={(e) => setRecoveryUrl(e.target.value)}
                  placeholder="yourdomain.com"
                  required
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-muted-foreground">Email used at checkout</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="you@yourdomain.com"
                  required
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowRecovery(false)}
                  className="h-10 rounded-lg border border-border px-4 font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recoveryBusy}
                  className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {recoveryBusy ? "Looking up…" : "Send report link"}
                </button>
              </div>
            </form>

            {recoveryResult && (
              <div
                className={`mt-4 rounded-xl border p-4 text-xs font-mono ${
                  recoveryResult.ok
                    ? "border-pass/30 bg-pass/10 text-pass"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                <p>{recoveryResult.message}</p>
                {recoveryResult.directUrl && (
                  <a
                    href={recoveryResult.directUrl}
                    className="mt-3 inline-block font-semibold underline underline-offset-4"
                  >
                    Open recovered report &rarr;
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="border-y border-border bg-card/60">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="font-mono text-sm font-bold text-primary">{s.n}</span>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Why it matters on day one
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {stakes.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-base font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          What the report looks like
        </h2>
        <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="flex items-center gap-6 border-b border-border pb-6">
            <span className="font-mono text-5xl font-bold text-warn">64</span>
            <div className="text-left">
              <p className="text-sm font-semibold">example.com</p>
              <p className="text-sm text-muted-foreground">3 critical · 2 warnings · 5 passed</p>
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {["Meta description missing", "Sitemap not found", "No privacy policy link"].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                {t}
              </li>
            ))}
            <li className="select-none rounded-md bg-muted px-4 py-6 text-center text-sm text-muted-foreground blur-[2px]">
              7 more issues found
            </li>
          </ul>
        </div>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground sm:flex-row sm:gap-3">
          <Link
            to="/report/sample"
            className="font-mono text-xs font-semibold text-primary hover:underline"
          >
            See a full sample report →
          </Link>
          <span className="hidden sm:inline">·</span>
          <span>
            Curious what each check means?{" "}
            <Link to="/about" className="font-medium text-primary hover:underline">
              See all ten and why they matter
            </Link>
            .
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Frequently asked questions
        </h2>
        <h3 className="mt-3 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Common questions before launch
        </h3>
        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1">
              <AccordionTrigger className="text-left font-medium">
                Do you store my site's data?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Only the URL and scan results, to generate your report; we don't crawl beyond the page you submit, and we never sell your data.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger className="text-left font-medium">
                Can I rescan for free after I fix issues?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Yes, rescanning the same URL is free once you've unlocked a report for it.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger className="text-left font-medium">
                What if my site needs a login to view?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Currently we only check publicly accessible pages. If your app is behind authentication or a waitlist, scan your landing or login page instead.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4">
              <AccordionTrigger className="text-left font-medium">
                Do you offer refunds?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Because reports are delivered digitally and instantly upon scan completion, sales are generally final. However, if a technical issue prevented your report from generating or produced corrupted data, contact support within 7 days for an immediate full refund.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <Footer />
    </main>
  );
}
