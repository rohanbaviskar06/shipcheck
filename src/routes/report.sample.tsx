import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShareCardPreviewSimulator } from "@/components/ShareCardPreviewSimulator";
import { Footer } from "@/components/Footer";
import type { CheckStatus } from "@/lib/scan.functions";
import { ArrowLeft, CheckCircle2, Download, Sparkles } from "lucide-react";
import { generateReportPdf, downloadPdfBlob } from "@/lib/pdf";

export const Route = createFileRoute("/report/sample")({
  head: () => ({
    meta: [
      { title: "Sample Pre-launch Report (Score 64/100) — ShipCheck" },
      {
        name: "description",
        content:
          "Explore a full sample pre-launch report on ShipCheck with all 10 checks, fix instructions, and social preview simulator unlocked.",
      },
      { property: "og:title", content: "Sample Pre-launch Report — ShipCheck" },
      {
        property: "og:description",
        content: "See exactly what the full $9 ShipCheck report contains before paying.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/report/sample" },
    ],
    links: [{ rel: "canonical", href: "/report/sample" }],
  }),
  component: SampleReport,
});

type SampleCheck = {
  id: string;
  name: string;
  status: CheckStatus;
  weight: number;
  detail: string;
  fix: string;
  preview?: {
    title?: string;
    description?: string;
    image?: string;
  };
};

const sampleChecks: SampleCheck[] = [
  {
    id: "legal",
    name: "Legal pages",
    status: "critical",
    weight: 12,
    detail: "No privacy policy or terms links detected in the navigation or footer.",
    fix: "Publish a /privacy and /terms page and link both clearly in your global footer. Payment processors (Stripe, Razorpay) and app directories verify these before launch.",
  },
  {
    id: "og",
    name: "Social sharing preview",
    status: "critical",
    weight: 10,
    detail: "Missing og:image tag. Shared links on X, Slack, and Discord render without a preview banner image.",
    fix: 'Add <meta property="og:image" content="https://craftdesk.app/og-image.png"> with a 1200×630px image in your <head>. Make sure the image URL is absolute with https://.',
    preview: {
      title: "Craftdesk — The calm workspace for indie makers",
      description: "Plan, track, and ship software without Jira bloat. Made for indie builders.",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=630&fit=crop",
    },
  },
  {
    id: "description",
    name: "Meta description",
    status: "critical",
    weight: 10,
    detail: "No meta description tag found on the page.",
    fix: 'Add <meta name="description" content="..."> with a 50–160 character summary of your product and value proposition.',
  },
  {
    id: "ai",
    name: "AI crawler visibility",
    status: "warning",
    weight: 12,
    detail: "AI crawlers (GPTBot, ClaudeBot, PerplexityBot) are allowed, but no /llms.txt was detected at the root.",
    fix: "Create an /llms.txt file at your site root with a plain-markdown description of your product, pricing, and API endpoints so AI engines can accurately cite your site.",
  },
  {
    id: "robots",
    name: "robots.txt",
    status: "warning",
    weight: 8,
    detail: "robots.txt exists and allows crawling, but doesn't declare a Sitemap directive.",
    fix: "Add 'Sitemap: https://craftdesk.app/sitemap.xml' to the bottom of your robots.txt to speed up search engine indexing.",
  },
  {
    id: "title",
    name: "Page title",
    status: "pass",
    weight: 12,
    detail: '"Craftdesk — The calm workspace for indie makers" (45 characters).',
    fix: "",
  },
  {
    id: "https",
    name: "HTTPS",
    status: "pass",
    weight: 12,
    detail: "The page is served securely over HTTPS with valid SSL certificates.",
    fix: "",
  },
  {
    id: "viewport",
    name: "Mobile viewport",
    status: "pass",
    weight: 10,
    detail: "Viewport is configured for mobile devices with width=device-width.",
    fix: "",
  },
  {
    id: "sitemap",
    name: "Sitemap",
    status: "pass",
    weight: 8,
    detail: "sitemap.xml is reachable and contains 12 indexed page URLs.",
    fix: "",
  },
  {
    id: "favicon",
    name: "Favicon",
    status: "pass",
    weight: 6,
    detail: "Icon loads from https://craftdesk.app/favicon.ico and is declared in the page head.",
    fix: "",
  },
];

const dot: Record<CheckStatus, string> = {
  pass: "bg-pass",
  warning: "bg-warn",
  critical: "bg-destructive",
};

function SampleReport() {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const bytes = await generateReportPdf({
        url: "https://craftdesk.app",
        score: 64,
        scannedAt: new Date().toISOString(),
        checks: sampleChecks,
      });
      downloadPdfBlob(bytes, "shipcheck-sample-craftdesk.pdf");
    } catch (err) {
      console.error("Failed to generate sample PDF", err);
      alert("Failed to generate sample PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Sample banner */}
      <div className="border-b border-primary/20 bg-primary/10 px-6 py-3 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 sm:flex-row">
          <div className="flex items-center gap-2 font-mono text-xs text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>
              <strong className="text-primary">LIVE SAMPLE REPORT:</strong> Showing the full $9 report with all 10 checks & fix suggestions unlocked.
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 font-mono text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Scan your own site →
          </Link>
        </div>
      </div>

      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-8">
        <Link to="/" className="font-mono text-sm font-bold tracking-tight">
          ship<span className="text-primary">check</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            run your scan
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        {/* Score card */}
        <div className="animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-8 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Pre-launch report · Sample site
            </p>
            <p className="font-mono text-xs text-muted-foreground">September 11, 2026</p>
          </div>

          <div className="px-8 pt-8 pb-9">
            <p className="break-all font-mono text-sm text-muted-foreground">craftdesk.app</p>
            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
              <span className="animate-score font-mono text-8xl font-bold leading-none tracking-tighter text-warn">
                64
              </span>
              <span className="pb-3 font-mono text-sm text-muted-foreground">/ 100</span>
              <span className="pb-3 text-xl font-semibold tracking-tight sm:ml-auto">
                Needs work
              </span>
            </div>

            <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="animate-meter h-full w-full rounded-full bg-warn"
                style={{ "--meter": 0.64 } as React.CSSProperties}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs">
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">
                3 critical
              </span>
              <span className="rounded-full bg-warn/15 px-3 py-1 text-warn">
                2 warnings
              </span>
              <span className="rounded-full bg-pass/10 px-3 py-1 text-pass">
                5 passed
              </span>
            </div>
          </div>
        </div>

        {/* Unlocked report header */}
        <div className="animate-rise mt-14 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Full report (Unlocked)</h2>
            <p className="font-mono text-xs text-muted-foreground">
              All 10 checks with failure details and exact fix instructions
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span>{downloadingPdf ? "Creating PDF…" : "Download sample PDF"}</span>
          </button>
        </div>

        {/* 10 Checks list */}
        <ul className="mt-6 space-y-4">
          {sampleChecks.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-card p-5 shadow-card transition"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[c.status]}`} />
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="ml-auto font-mono text-xs uppercase text-muted-foreground">
                  {c.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.detail}</p>

              {/* Check #3: Social sharing preview simulator embedded! */}
              {c.id === "og" && (
                <ShareCardPreviewSimulator
                  title={c.preview?.title}
                  description={c.preview?.description}
                  image={c.preview?.image}
                  host="craftdesk.app"
                />
              )}

              {c.fix ? (
                <div className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                    Fix instructions
                  </span>
                  <p className="mt-1 text-foreground font-mono text-xs sm:text-sm">{c.fix}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-card/60 p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 text-xl font-semibold tracking-tight">
            Ready to find what will hurt your launch?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Get an instant free score + top 3 issues for your own domain in 10 seconds.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex h-11 items-center rounded-lg bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Scan your site now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
