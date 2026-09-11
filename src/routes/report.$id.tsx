import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getScan, rescanUrl, saveEmail } from "@/lib/scan.functions";
import type { CheckStatus } from "@/lib/scan.functions";
import { createOrder, verifyPayment, PRICES, type Currency } from "@/lib/payment.functions";
import { Footer } from "@/components/Footer";
import { ShareCardPreviewSimulator } from "@/components/ShareCardPreviewSimulator";
import { Download, RefreshCw, CheckCircle2, Sparkles, Mail } from "lucide-react";
import { generateReportPdf, downloadPdfBlob } from "@/lib/pdf";
import { ScoreComparisonCard } from "@/components/ScoreComparisonCard";
import { Confetti } from "@/components/Confetti";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function Unlock({
  scanId,
  locked,
  onUnlocked,
}: {
  scanId: string;
  locked: number;
  onUnlocked?: (email: string) => void;
}) {
  const router = useRouter();
  const order = useServerFn(createOrder);
  const verify = useServerFn(verifyPayment);
  const [currency, setCurrency] = useState<Currency>("INR");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (busy) return;
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError("Please enter a valid email address to receive your report.");
      return;
    }

    setBusy(true);
    try {
      const created = await order({ data: { id: scanId, currency, email: trimmedEmail } });
      if (created.alreadyPaid) {
        if (onUnlocked) onUnlocked(trimmedEmail);
        await router.invalidate();
        return;
      }
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) throw new Error("Payment window couldn't load. Try again.");

      const rzp = new window.Razorpay({
        key: created.keyId,
        order_id: created.orderId,
        amount: created.amount,
        currency: created.currency,
        name: "ShipCheck",
        description: "Full pre-launch report",
        prefill: {
          email: trimmedEmail,
        },
        handler: async (res: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verify({
              data: {
                id: scanId,
                orderId: res.razorpay_order_id,
                paymentId: res.razorpay_payment_id,
                signature: res.razorpay_signature,
                email: trimmedEmail,
              },
            });
            if (onUnlocked) onUnlocked(trimmedEmail);
          } catch {
            /* webhook will unlock it shortly */
          }
          for (let i = 0; i < 6; i++) {
            await router.invalidate();
            await new Promise((r) => setTimeout(r, 1500));
            if (document.querySelector("[data-paid]")) break;
          }
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: "#e2562b" },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 flex flex-col items-center justify-center gap-3.5 bg-card/85 px-6 py-10 sm:py-12 text-center backdrop-blur-[2px]">
      <p className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
        {locked} more issues — unlock the full report
      </p>
      <p className="max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
        Every issue with the exact fix, a one-page PDF, and a link you can send to whoever owns the
        code. One payment, no account.
      </p>

      <div className="flex rounded-lg border border-border bg-card p-1 font-mono text-xs shadow-sm">
        {(["INR", "USD"] as Currency[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            className={`rounded px-3 py-1 transition ${
              currency === c ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {PRICES[c].label}
          </button>
        ))}
      </div>

      <form onSubmit={pay} className="w-full max-w-sm space-y-2.5 pt-1">
        <div className="text-left">
          <label className="block font-mono text-[11px] text-muted-foreground mb-1 text-center">
            Email address (required for report link & receipt)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="you@yourdomain.com"
            required
            aria-label="Email address for report receipt"
            className="h-11 w-full rounded-lg border border-input bg-background/90 px-4 font-mono text-sm text-foreground text-center shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Opening checkout…" : `Unlock full report — ${PRICES[currency].label}`}
        </button>
      </form>

      {error ? <p className="font-mono text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export const Route = createFileRoute("/report/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    alreadyUnlocked:
      search.alreadyUnlocked === "true" || search.alreadyUnlocked === true
        ? ("true" as const)
        : undefined,
  }),
  loaderDeps: ({ search: { alreadyUnlocked } }) => ({ alreadyUnlocked }),
  loader: async ({ params, deps }) => {
    try {
      return {
        scan: await getScan({ data: { id: params.id } }),
        alreadyUnlocked: deps.alreadyUnlocked === "true",
      };
    } catch {
      return { scan: null, alreadyUnlocked: false };
    }
  },
  head: ({ params, loaderData }) => {
    const scan = loaderData?.scan;
    const isImproved = scan?.previousScan && scan.score > scan.previousScan.score;
    const title = scan
      ? isImproved
        ? `${scan.previousScan.score} → ${scan.score}/100 pre-launch score — ShipCheck`
        : `${scan.score}/100 pre-launch score — ShipCheck`
      : "Your ShipCheck report";
    const description = scan
      ? isImproved
        ? `${scan.url} improved from ${scan.previousScan.score} to ${scan.score}/100 after fixing pre-launch issues on ShipCheck.`
        : `${scan.url} scored ${scan.score}/100 on ShipCheck's ten pre-launch checks. See what's broken before launch day.`
      : "Your pre-launch score and the issues found on your site.";
    const image = scan?.ogImage?.startsWith("http")
      ? isImproved
        ? `${scan.ogImage}?type=progress&prev=${scan.previousScan.score}`
        : scan.ogImage
      : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/report/${params.id}` },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  component: Report,
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
});

const scoreColor = (score: number) =>
  score >= 80 ? "text-pass" : score >= 50 ? "text-warn" : "text-destructive";

const meterColor = (score: number) =>
  score >= 80 ? "bg-pass" : score >= 50 ? "bg-warn" : "bg-destructive";

const verdict = (score: number) =>
  score >= 80 ? "Ready to ship" : score >= 50 ? "Needs work" : "Not ready yet";

const dot: Record<CheckStatus, string> = {
  pass: "bg-pass",
  warning: "bg-warn",
  critical: "bg-destructive",
};

function Missing() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-background text-center">
      <div className="my-auto px-6 py-20">
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
      <Footer />
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
      {copied ? "link copied" : "copy link"}
    </button>
  );
}

function ShareOnX({ score, host }: { score: number; host: string }) {
  const text = `${host} scored ${score}/100 on its pre-launch check. Ten things that quietly sink launch day — worth a scan before you post:`;
  return (
    <button
      onClick={() => {
        const url = new URL("https://twitter.com/intent/tweet");
        url.searchParams.set("text", text);
        url.searchParams.set("url", window.location.href);
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      }}
      className="h-9 rounded-lg bg-foreground px-4 font-mono text-xs text-background transition hover:opacity-90"
    >
      share score
    </button>
  );
}

function EmailCapture({ scanId }: { scanId: string }) {
  const submit = useServerFn(saveEmail);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <p className="animate-rise mt-8 rounded-lg border border-border bg-card px-5 py-4 font-mono text-xs text-muted-foreground">
        Thanks — we'll send new checks as we add them. Nothing else.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (state === "busy") return;
        setState("busy");
        try {
          await submit({ data: { id: scanId, email } });
          setState("done");
        } catch {
          setState("error");
        }
      }}
      className="mt-8 rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <p className="text-sm font-semibold tracking-tight">
        Want the checklist for your next launch?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. Your email, only for new checks and launch tips — never shared.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourdomain.com"
          aria-label="Email address"
          className="h-11 flex-1 rounded-lg border border-input bg-background px-4 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
        />
        <button
          type="submit"
          disabled={state === "busy"}
          className="h-11 rounded-lg border border-border bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:border-primary disabled:opacity-60"
        >
          {state === "busy" ? "Saving…" : "Keep me posted"}
        </button>
      </div>
      {state === "error" ? (
        <p className="mt-3 font-mono text-xs text-destructive">
          That email didn't look right — try again, or skip it.
        </p>
      ) : null}
    </form>
  );
}

function Report() {
  const { scan, alreadyUnlocked } = Route.useLoaderData();
  const router = useRouter();
  const rescan = useServerFn(rescanUrl);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [unlockedEmail, setUnlockedEmail] = useState<string | null>(null);

  if (!scan) return <Missing />;

  async function handleRescan() {
    if (rescanning || !scan) return;
    setRescanning(true);
    setRescanError(null);
    try {
      const res = await rescan({ data: { scanId: scan.id } });
      if (res?.id) {
        await router.navigate({ to: "/report/$id", params: { id: res.id } });
      }
    } catch (err) {
      setRescanError(err instanceof Error ? err.message : "Re-scan failed. Please try again.");
    } finally {
      setRescanning(false);
    }
  }

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

  let host = scan.url;
  try {
    host = new URL(scan.url).host.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }

  const ogCheck = scan.checks.find((c) => c.id === "og");
  const titleCheck = scan.checks.find((c) => c.id === "title");
  const descCheck = scan.checks.find((c) => c.id === "description");
  const previewTitle =
    ogCheck?.preview?.title ||
    titleCheck?.detail?.match(/"([^"]+)"/)?.[1] ||
    host;
  const previewDesc =
    ogCheck?.preview?.description ||
    (descCheck?.detail && !descCheck.detail.startsWith("No meta") ? descCheck.detail : undefined);
  const previewImage = ogCheck?.preview?.image;

  const displayEmail = unlockedEmail || scan.email;

  return (
    <main className="flex min-h-screen flex-col justify-between bg-background text-foreground">
      <div>
        <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-8">
          <Link to="/" className="font-mono text-sm font-bold tracking-tight">
            ship<span className="text-primary">check</span>
          </Link>
          <div className="flex items-center gap-2">
            {scan.paid && (
              <button
                type="button"
                onClick={handleRescan}
                disabled={rescanning}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 font-mono text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                title="Re-run all 10 checks against this URL"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${rescanning ? "animate-spin" : ""}`} />
                <span>{rescanning ? "rescanning…" : "rescan URL"}</span>
              </button>
            )}
            <ShareOnX score={scan.score} host={host} />
            <CopyLink />
            <Link to="/" className="ml-1 font-mono text-xs text-muted-foreground hover:text-foreground">
              new scan
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          {/* Active rescanning banner */}
          {rescanning && (
            <div className="animate-rise mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center shadow-card">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-sm font-semibold tracking-tight">Re-scanning {host}…</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Re-running all 10 pre-launch checks to verify your fixes.
              </p>
            </div>
          )}

          {/* Rescan error banner */}
          {rescanError && (
            <div className="animate-rise mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive">
              <span>{rescanError}</span>
              <button
                type="button"
                onClick={() => setRescanError(null)}
                className="ml-2 font-semibold underline hover:opacity-80"
              >
                dismiss
              </button>
            </div>
          )}

          {/* Requirement 3: Email reinforcement message on paid report */}
          {scan.paid && displayEmail && (
            <div className="animate-rise mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-pass/30 bg-pass/10 p-4 font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-pass" />
                <span>
                  We've emailed your report link to <strong>{displayEmail}</strong> — bookmark it or save the link below
                </span>
              </div>
              <div className="shrink-0">
                <CopyLink />
              </div>
            </div>
          )}

          {/* Requirement 4: Already-unlocked banner when redirected or looking at paid URL */}
          {alreadyUnlocked && (
            <div className="animate-rise mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  You've already unlocked a report for this URL — viewing your active report.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRescan}
                disabled={rescanning}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${rescanning ? "animate-spin" : ""}`} />
                <span>Re-scan now</span>
              </button>
            </div>
          )}

          {/* Requirement 4: Notice if viewing unpaid report when an unlocked version exists */}
          {!scan.paid && scan.existingPaidScanId && (
            <div className="animate-rise mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span>You've already unlocked a report for this URL</span>
              </div>
              <Link
                to="/report/$id"
                params={{ id: scan.existingPaidScanId }}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                View unlocked report &rarr;
              </Link>
            </div>
          )}

          {/* Score comparison card if this scan is linked to a previous scan */}
          {scan.previousScan && (
            <ScoreComparisonCard
              currentScore={scan.score}
              currentChecks={scan.checks}
              previousScan={scan.previousScan}
              scanId={scan.id}
              url={scan.url}
              host={host}
            />
          )}

          {/* Confetti celebration if score improved */}
          {scan.previousScan && scan.score > scan.previousScan.score && (
            <Confetti />
          )}

          {/* Score card — designed to look right as a screenshot */}
          <div className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-8 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Pre-launch report
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {new Date(scan.scannedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="px-8 pt-8 pb-9">
              <p className="break-all font-mono text-sm text-muted-foreground">{host}</p>
              <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
                <span
                  className={`animate-score font-mono text-8xl font-bold leading-none tracking-tighter ${scoreColor(scan.score)}`}
                >
                  {scan.score}
                </span>
                <span className="pb-3 font-mono text-sm text-muted-foreground">/ 100</span>
                <span className="pb-3 text-xl font-semibold tracking-tight sm:ml-auto">
                  {verdict(scan.score)}
                </span>
              </div>

              <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`animate-meter h-full w-full rounded-full ${meterColor(scan.score)}`}
                  style={{ "--meter": scan.score / 100 } as React.CSSProperties}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs">
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">
                  {criticals} critical
                </span>
                <span className="rounded-full bg-warn/15 px-3 py-1 text-warn">
                  {warnings} warnings
                </span>
                <span className="rounded-full bg-pass/10 px-3 py-1 text-pass">{passes} passed</span>
              </div>
            </div>
          </div>

          {scan.paid ? (
            <>
              <div
                data-paid
                className="animate-rise mt-14 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Full report</h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    All 10 checks with failure details and exact fix instructions
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRescan}
                    disabled={rescanning}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${rescanning ? "animate-spin" : ""}`} />
                    <span>{rescanning ? "Re-scanning…" : "Rescan this URL"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (downloadingPdf) return;
                      setDownloadingPdf(true);
                      try {
                        const bytes = await generateReportPdf({
                          url: scan.url,
                          score: scan.score,
                          scannedAt: scan.scannedAt,
                          checks: scan.checks,
                        });
                        downloadPdfBlob(bytes, `shipcheck-${host || scan.id.slice(0, 8)}.pdf`);
                      } catch (err) {
                        console.error("PDF generation failed", err);
                        alert("PDF generation failed. Please try again.");
                      } finally {
                        setDownloadingPdf(false);
                      }
                    }}
                    disabled={downloadingPdf}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    <span>{downloadingPdf ? "Creating PDF…" : "Download PDF"}</span>
                  </button>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {ranked.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${dot[c.status]}`} />
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="ml-auto font-mono text-xs uppercase text-muted-foreground">
                        {c.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.detail}</p>

                    {/* Check #3: Social sharing preview simulator */}
                    {c.id === "og" && (
                      <ShareCardPreviewSimulator
                        title={c.preview?.title || previewTitle}
                        description={c.preview?.description || previewDesc}
                        image={c.preview?.image || previewImage}
                        host={host}
                      />
                    )}

                    {c.fix ? (
                      <p className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed">
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
              <h2 className="mt-14 text-lg font-semibold tracking-tight">
                {top.length > 0 ? "Your top issues" : "Nothing critical found"}
              </h2>
              <ul className="mt-5 space-y-3">
                {top.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-border bg-card p-5 text-sm shadow-card"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${dot[c.status]}`} />
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-auto font-mono text-xs uppercase text-muted-foreground">
                        {c.status}
                      </span>
                    </div>
                    {c.id === "og" ? (
                      <>
                        <p className="mt-2 text-sm text-muted-foreground">{c.detail}</p>
                        <ShareCardPreviewSimulator
                          title={c.preview?.title || previewTitle}
                          description={c.preview?.description || previewDesc}
                          image={c.preview?.image || previewImage}
                          host={host}
                        />
                      </>
                    ) : null}
                  </li>
                ))}
                {top.length === 0 ? (
                  <li className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
                    Every check passed on this page.
                  </li>
                ) : null}
              </ul>

              {/* If ogCheck wasn't in top 3 (e.g. it passed or was #4), still show the simulator in Free mode */}
              {!top.some((c) => c.id === "og") && ogCheck && (
                <div className="mt-5 rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot[ogCheck.status]}`} />
                    <span className="font-semibold text-sm">{ogCheck.name}</span>
                    <span className="ml-auto font-mono text-xs uppercase text-muted-foreground">
                      {ogCheck.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{ogCheck.detail}</p>
                  <ShareCardPreviewSimulator
                    title={ogCheck.preview?.title || previewTitle}
                    description={ogCheck.preview?.description || previewDesc}
                    image={ogCheck.preview?.image || previewImage}
                    host={host}
                  />
                </div>
              )}

              <div className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-card">
                <div
                  className="absolute inset-0 space-y-3 p-6 blur-[5px] select-none pointer-events-none opacity-30 overflow-hidden"
                  aria-hidden="true"
                >
                  {[
                    ...ranked.slice(top.length).filter((c) => c.id !== "og"),
                    ...ranked.slice(top.length).filter((c) => c.id !== "og"),
                  ].map((c, i) => (
                    <div key={`${c.id}-${i}`} className="flex items-center gap-3 text-sm">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${dot[c.status]}`} />
                      <span className="font-medium">{c.name}</span>
                      <span className="truncate text-muted-foreground">— {c.detail}…</span>
                    </div>
                  ))}
                </div>
                <Unlock
                  scanId={scan.id}
                  locked={locked}
                  onUnlocked={(em) => setUnlockedEmail(em)}
                />
              </div>

              <EmailCapture scanId={scan.id} />
            </>
          )}

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Not sure what a check means?{" "}
            <Link to="/about" className="font-medium text-primary hover:underline">
              See all ten and why they matter
            </Link>
            .
          </p>
        </section>
      </div>

      <Footer />
    </main>
  );
}
