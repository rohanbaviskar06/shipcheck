import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "What ShipCheck checks — and why it matters" },
      {
        name: "description",
        content:
          "The ten pre-launch checks ShipCheck runs on your site, what each one costs you if it's broken, and how to fix it.",
      },
      { property: "og:title", content: "What ShipCheck checks — and why it matters" },
      {
        property: "og:description",
        content:
          "The ten pre-launch checks ShipCheck runs on your site, what each one costs you if it's broken.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

const checks = [
  {
    name: "Page title",
    what: "A title tag between 10 and 60 characters.",
    why: "It's the clickable headline in Google and the tab name people scan. Missing or truncated, you lose the click before anyone sees the product.",
  },
  {
    name: "Meta description",
    what: "A description between 50 and 160 characters.",
    why: "Google writes its own if you don't, usually by scraping a random sentence. Yours converts better than theirs.",
  },
  {
    name: "Social sharing preview",
    what: "og:title, og:description and og:image present.",
    why: "This is the card people see when your link hits X, Slack or Discord. A bare URL gets a fraction of the clicks of a card with an image.",
  },
  {
    name: "Favicon",
    what: "An icon that's declared in the head and actually loads.",
    why: "Twenty open tabs and yours is the blank page icon. It reads as unfinished, which is the last thing you want on launch day.",
  },
  {
    name: "robots.txt",
    what: "Exists and doesn't carry a site-wide Disallow: /.",
    why: "A leftover staging robots.txt is the single most common launch-day disaster: perfect site, invisible to every search engine.",
  },
  {
    name: "Sitemap",
    what: "A valid sitemap.xml at the root or referenced from robots.txt.",
    why: "It tells crawlers which pages exist on a brand-new domain with no inbound links yet. It's how you get indexed in days rather than weeks.",
  },
  {
    name: "HTTPS",
    what: "The page loads over a working, enforced HTTPS connection.",
    why: "Browsers label anything else 'Not secure'. Nobody types a card number into that, and nobody links to it.",
  },
  {
    name: "Mobile viewport",
    what: "A viewport meta tag set to width=device-width.",
    why: "Without it phones render your desktop layout zoomed out. Most launch traffic is a phone in a feed.",
  },
  {
    name: "AI crawler visibility",
    what: "GPTBot, ClaudeBot, Google-Extended and PerplexityBot aren't blocked, plus an llms.txt at the root.",
    why: "A growing share of 'best tool for X' research happens inside an assistant now. Blocked crawlers can't recommend you, and llms.txt is how you tell them what you do in your own words.",
  },
  {
    name: "Legal pages",
    what: "Privacy policy and terms links detectable in nav or footer.",
    why: "Payment providers, app stores and directories all check. Missing pages can hold up your Stripe or Razorpay account at the worst moment.",
  },
];

function About() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <Link to="/" className="font-mono text-sm font-bold tracking-tight">
          ship<span className="text-primary">check</span>
        </Link>
        <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">
          run a scan
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-6 pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          What we check
        </p>
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Ten things that quietly cost you your launch
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          None of these are hard to fix. They're just invisible from inside your own build — which
          is exactly why they survive until the day traffic arrives. ShipCheck fetches your page the
          way a crawler does and reports what it can and can't see.
        </p>

        <div className="mt-14 space-y-10">
          {checks.map((c, i) => (
            <section key={c.name} className="border-t border-border pt-8">
              <span className="font-mono text-xs font-bold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">{c.name}</h2>
              <p className="mt-3 font-mono text-sm text-muted-foreground">{c.what}</p>
              <p className="mt-3 leading-relaxed">{c.why}</p>
            </section>
          ))}
        </div>

        <section className="mt-16 border-t border-border pt-8">
          <h2 className="text-xl font-semibold tracking-tight">How the score works</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Each check is a pass, a warning or critical, and each carries a weight — HTTPS and
            blocked crawlers matter more than a missing favicon. The score is the weighted average
            out of 100. Any single critical issue caps the score below 70, because one blocked
            crawler undoes ten small wins.
          </p>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The free report gives you the score and your top three issues. The full report, nine
            dollars once, gives you every issue with the exact fix, a PDF, and a link you can send
            to whoever owns the code.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Scan my site
          </Link>
        </section>
      </article>

      <footer className="border-t border-border px-6 py-10 text-center font-mono text-xs text-muted-foreground">
        ShipCheck · check before you ship
      </footer>
    </main>
  );
}
