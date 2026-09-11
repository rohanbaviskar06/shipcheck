import { useState } from "react";
import type { CheckResult, PreviousScanSummary } from "@/lib/scan.functions";
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Share2, Copy, Check, Sparkles } from "lucide-react";

interface ScoreComparisonCardProps {
  currentScore: number;
  currentChecks: CheckResult[];
  previousScan: PreviousScanSummary;
  scanId: string;
  url: string;
  host: string;
}

export function ScoreComparisonCard({
  currentScore,
  currentChecks,
  previousScan,
  scanId,
  url,
  host,
}: ScoreComparisonCardProps) {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const prevScore = previousScan.score;
  const delta = currentScore - prevScore;
  const isImproved = delta > 0;
  const isNeutral = delta === 0;

  // Identify checks that flipped from fail/warning to pass
  const prevCheckMap = new Map(previousScan.checks.map((c) => [c.id, c.status]));
  const fixedChecks = currentChecks.filter((curr) => {
    const prevStatus = prevCheckMap.get(curr.id);
    return curr.status === "pass" && (prevStatus === "critical" || prevStatus === "warning");
  });

  const progressOgUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/public/report/${scanId}/og-image?type=progress&prev=${prevScore}`
    : `/api/public/report/${scanId}/og-image?type=progress&prev=${prevScore}`;

  const shareText = `Our site score on ShipCheck improved from ${prevScore} to ${currentScore}/100! Fixed critical pre-launch issues before launching ${host}:`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareOnX = () => {
    const tweetUrl = new URL("https://twitter.com/intent/tweet");
    tweetUrl.searchParams.set("text", shareText);
    tweetUrl.searchParams.set("url", window.location.href);
    window.open(tweetUrl.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="animate-rise mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* Header Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 ${
          isImproved
            ? "bg-pass/10"
            : isNeutral
            ? "bg-muted/40"
            : "bg-destructive/10"
        }`}
      >
        <div className="flex items-center gap-2">
          {isImproved ? (
            <>
              <Sparkles className="h-4 w-4 text-pass" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-pass">
                Score Improved · Re-scan Verified
              </span>
            </>
          ) : isNeutral ? (
            <>
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Re-scan Complete · No Score Change
              </span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-destructive">
                Score Changed
              </span>
            </>
          )}
        </div>

        <p className="font-mono text-xs text-muted-foreground">
          Previous scan:{" "}
          {new Date(previousScan.scannedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {/* Score delta showcase */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-muted-foreground">
                {prevScore}
              </span>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Before
              </p>
            </div>

            <span className="font-mono text-2xl text-muted-foreground">→</span>

            <div className="text-center">
              <span
                className={`font-mono text-4xl sm:text-5xl font-extrabold ${
                  isImproved
                    ? "text-pass"
                    : isNeutral
                    ? "text-muted-foreground"
                    : "text-destructive"
                }`}
              >
                {currentScore}
              </span>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-foreground font-semibold">
                Now
              </p>
            </div>

            {/* Delta indicator pill */}
            <div
              className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold ${
                isImproved
                  ? "bg-pass/15 text-pass"
                  : isNeutral
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {isImproved ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+{delta} points</span>
                </>
              ) : isNeutral ? (
                <span>0 points</span>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>{delta} points</span>
                </>
              )}
            </div>
          </div>

          {/* Share button */}
          {isImproved && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <Share2 className="h-4 w-4" />
                <span>Share your progress</span>
              </button>
            </div>
          )}
        </div>

        {/* Flipped checks list */}
        {fixedChecks.length > 0 ? (
          <div className="mt-6 border-t border-border pt-6">
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Issues resolved in this re-scan ({fixedChecks.length})
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {fixedChecks.map((c) => {
                const prevStatus = prevCheckMap.get(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 rounded-lg border border-pass/20 bg-pass/5 px-3 py-2 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-pass" />
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="ml-auto font-mono text-[10px] uppercase text-pass font-semibold">
                      {prevStatus} → pass
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isImproved ? (
          <p className="mt-4 font-mono text-xs text-muted-foreground border-t border-border pt-4">
            Total score improved through weighted issue refinements.
          </p>
        ) : null}
      </div>

      {/* Share Progress Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight">
                Share your progress ({prevScore} → {currentScore})
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Social cards automatically render a before-and-after comparison showing your verified {delta}-point improvement.
            </p>

            {/* OG Card Preview */}
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={progressOgUrl}
                alt={`Score progress card: ${prevScore} to ${currentScore}`}
                className="h-auto w-full object-cover"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-4 font-mono text-xs text-foreground transition hover:border-primary"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-pass" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Link copied" : "Copy report link"}</span>
              </button>

              <button
                type="button"
                onClick={shareOnX}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 font-mono text-xs text-background transition hover:opacity-90"
              >
                <span>Post on X / Twitter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
