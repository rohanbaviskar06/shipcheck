import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ShipCheck" },
      {
        name: "description",
        content:
          "How ShipCheck collects, processes, and protects data when you scan websites and pre-launch pages.",
      },
      { property: "og:title", content: "Privacy Policy — ShipCheck" },
      {
        property: "og:description",
        content: "How ShipCheck handles your URLs and scan data. No data selling, stored only for report generation.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Last updated: September 11, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              1. Information We Collect
            </h2>
            <p>
              When you use ShipCheck, we collect minimal data required to deliver automated site diagnostics:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-foreground">Submitted Webpage URLs:</strong> The publicly accessible web address you enter into the scanner.
              </li>
              <li>
                <strong className="text-foreground">Automated Diagnostic Results:</strong> The metadata, response headers, Open Graph tags, robots.txt directives, and sitemap data returned when fetching the single page you submitted.
              </li>
              <li>
                <strong className="text-foreground">Abuse Prevention Telemetry:</strong> A cryptographic one-way hash of your IP address (salted and irreversibly hashed) to enforce fair-use rate limits (maximum 5 scans per hour).
              </li>
              <li>
                <strong className="text-foreground">Optional Email Address:</strong> If you voluntarily enter your email to receive checklist updates, we store it solely for product updates.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              2. How We Use Your Data
            </h2>
            <p>
              Your data is processed strictly for the following purposes:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Executing the 10 automated pre-launch checks and calculating your site's readiness score.</li>
              <li>Rendering your online report and generating your downloadable PDF report.</li>
              <li>Allowing you to share your public report link with teammates or collaborators.</li>
              <li>Preventing malicious traffic or denial-of-service attempts against our infrastructure.</li>
            </ul>
            <p>
              We do <em>not</em> crawl beyond the single URL submitted. We do not index pages behind passwords, forms, or paywalls.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              3. We Do Not Sell Your Data
            </h2>
            <p>
              We never sell, rent, license, or monetize your submitted URLs, scan results, or personal details to third-party data brokers, advertising networks, or analytics firms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              4. Payment Processing (Razorpay)
            </h2>
            <p>
              Report unlock fees ($9 / ₹299 one-time payment) are processed securely through our payment gateway partner,{" "}
              <strong className="text-foreground">Razorpay</strong>.
            </p>
            <p>
              ShipCheck does not collect, process, or store your credit card numbers, debit card details, UPI credentials, or bank information on our servers. All financial transactions occur within Razorpay's PCI-DSS compliant environment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              5. Data Retention & Deletion
            </h2>
            <p>
              Scan reports remain accessible via their unique shareable URLs so you can review improvements after applying fixes. If you would like a scan permanently purged from our database, email us with the report link and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              6. Contact Us
            </h2>
            <p>
              If you have any questions or privacy inquiries regarding ShipCheck, contact us at{" "}
              <span className="font-mono text-xs text-foreground">support@shipcheck.app</span>.
            </p>
          </section>
        </div>
      </article>

      <Footer />
    </main>
  );
}
