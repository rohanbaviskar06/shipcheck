import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ShipCheck" },
      {
        name: "description",
        content:
          "Terms of Service for ShipCheck, an automated website pre-launch inspection service.",
      },
      { property: "og:title", content: "Terms of Service — ShipCheck" },
      {
        property: "og:description",
        content: "Terms of Service governing the use of ShipCheck and one-time report unlocking.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-8">
        <Link to="/" className="font-mono text-sm font-bold tracking-tight">
          ship<span className="text-primary">check</span>
        </Link>
        <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">
          run a scan
        </Link>
      </header>

      <article className="mx-auto w-full max-w-3xl px-6 pb-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Legal
        </p>
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Last updated: September 11, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using ShipCheck ("we", "us", or "our"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              2. Permitted Use & Scanning Policy
            </h2>
            <p>
              ShipCheck is an automated diagnostic tool that fetches single publicly accessible webpages to inspect metadata, social sharing previews, robots.txt, sitemaps, and SSL configuration.
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>You may only submit URLs for websites that you own, operate, or have authorization to test.</li>
              <li>You agree not to use ShipCheck to attack, flood, harass, or disrupt third-party servers.</li>
              <li>Automated, scripted, or high-concurrency requests that circumvent our rate limits are prohibited.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              3. Diagnostic Nature & Disclaimer
            </h2>
            <p>
              ShipCheck reports and fix suggestions are provided for informational and educational purposes on an "as is" and "as available" basis. While our checks reflect current search engine and web platform best practices, we cannot guarantee:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Guaranteed placement, rankings, or indexation on Google, Product Hunt, or other platforms.</li>
              <li>That third-party platforms (such as X, Slack, or Discord) will not alter their preview caching or rendering standards.</li>
              <li>Uninterrupted or bug-free operation of external third-party servers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              4. Fees, Payment & Refund Policy
            </h2>
            <p>
              The basic scan score and top three issues are provided free of charge. Full reports can be unlocked for a one-time fee ($9 / ₹299) processed securely via Razorpay. There are no recurring subscriptions or surprise charges.
            </p>
            <p>
              <strong className="text-foreground">Refunds:</strong> Because full reports and downloadable PDFs are delivered digitally and instantly upon payment, all sales are generally final. However, if a technical error occurred on our infrastructure (such as an unrendered report, payment failure, or corrupted output), contact support within 7 days and we will issue a complete refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              5. Intellectual Property
            </h2>
            <p>
              You retain all rights to your own websites, trademarks, and content. ShipCheck and its creators retain all rights, title, and interest in and to the ShipCheck platform, including software, design, branding, scoring algorithms, and report formats.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              6. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, ShipCheck shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              7. Contact
            </h2>
            <p>
              Questions about these Terms of Service should be sent to{" "}
              <span className="font-mono text-xs text-foreground">support@shipcheck.app</span>.
            </p>
          </section>
        </div>
      </article>

      <Footer />
    </main>
  );
}
