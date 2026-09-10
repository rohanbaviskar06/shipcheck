import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { runScan } from "@/lib/scan.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShipCheck — Find what breaks before you launch" },
      {
        name: "description",
        content:
          "Paste your URL and get an instant pre-launch score across 10 SEO, AI-visibility, technical and legal checks.",
      },
      { property: "og:title", content: "ShipCheck — Find what breaks before you launch" },
      {
        property: "og:description",
        content:
          "Paste your URL and get an instant pre-launch score across 10 SEO, AI-visibility, technical and legal checks.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  { n: "01", title: "Paste your URL", body: "Any public page. No signup, no install, no code snippet." },
  { n: "02", title: "We run 10 checks", body: "SEO basics, social previews, AI-crawler access, robots, sitemap, HTTPS, legal pages." },
  { n: "03", title: "Fix before launch", body: "See your score and the issues that cost you traffic and trust on day one." },
];

function Index() {
  const navigate = useNavigate();
  const scan = useServerFn(runScan);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await scan({ data: { url } });
      navigate({ to: "/report/$id", params: { id: result.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <span className="font-mono text-sm font-bold tracking-tight">
          ship<span className="text-primary">check</span>
        </span>
        <span className="font-mono text-xs text-muted-foreground">10 checks · instant</span>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-12 pb-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Pre-launch site checker
        </p>
        <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Paste your URL.
          <br />
          <span className="text-primary">Find out what will hurt you</span> before you launch.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          A ten-point sweep of the things that quietly sink new sites: missing metadata, broken social
          previews, blocked crawlers, absent legal pages.
        </p>

        <form onSubmit={onSubmit} className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
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
            {busy ? "Scanning…" : "Scan"}
          </button>
        </form>
        {error ? <p className="mt-4 font-mono text-xs text-destructive">{error}</p> : null}
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          Free score + top 3 issues. Full report unlocks for $9.
        </p>
      </section>

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

      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
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
      </section>

      <footer className="border-t border-border px-6 py-10 text-center font-mono text-xs text-muted-foreground">
        ShipCheck · check before you ship
      </footer>
    </main>
  );
}
