# ShipCheck

Master Build Prompt — Pre-Launch Site Checker

Working name: ShipCheck 

One-liner: "Paste your URL. Find out what will hurt you before you launch."

Product Spec (paste this whole section into Lovable/Claude Code/Cursor as context before Phase 1)

What it does: User pastes a URL. The tool fetches the page and runs a set of automated checks (SEO basics, AI-crawler visibility, technical hygiene, legal pages). It shows a free instant score + top 3 issues. Paying unlocks the full report with every issue and fix suggestions, plus a downloadable PDF.

Tech stack:

Next.js (App Router) + Tailwind CSS + shadcn/ui

Supabase (Postgres + storage for PDFs)

Razorpay (one-time payment, no subscription)

Deployed on Vercel

Checks to run (v1 — 10 checks):

Title tag present, 10–60 chars

Meta description present, 50–160 chars

Open Graph image + og:title + og:description present

Favicon present and loads

robots.txt exists and isn't blocking everything (Disallow: /)

sitemap.xml exists and is reachable

HTTPS/SSL valid

Mobile viewport meta tag present

AI-crawler access — llms.txt present, GPTBot/common AI bots not blocked in robots.txt

Legal pages findable — privacy policy + terms links detected in footer/nav

Scoring: Each check is Pass / Warning / Critical. Score = weighted average → 0–100. Critical issues cap the score below 70 regardless of other passes.

Free tier: Score badge + top 3 issues (title only, no detail) + "Unlock full report" CTA.

Paid tier ($9 / ₹299, one-time via Razorpay): All 10 checks with full detail + specific fix instructions for each failure + downloadable PDF + shareable report link.

Database schema (Supabase):

sql

create table scans (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  score int,
  checks jsonb,        -- array of {check_name, status, detail, fix}
  paid boolean default false,
  razorpay_order_id text,
  razorpay_payment_id text,
  email text,
  created_at timestamptz default now()
);

API routes:

POST /api/scan → accepts URL, runs checks server-side, inserts row, returns scan id + free summary

GET /api/scan/[id] → returns scan result (gated: full detail only if paid = true)

POST /api/checkout → creates Razorpay order for a scan id

POST /api/webhook/razorpay → verifies payment signature, sets paid = true

GET /api/report/[id]/pdf → generates PDF from the full report (Phase 3)

Pages:

/ — hero, URL input, "how it works", sample report screenshot

/report/[id] — results page (free view by default, paywall unlocks full view)

/pricing — optional, can just be inline on report page

Phase 1 — Core Scanner MVP (build this first, ship it, test it)

Build a Next.js (App Router) + Tailwind + shadcn/ui app called ShipCheck.

Homepage (/):
- Hero section: headline "Paste your URL. Find out what will hurt you before you launch."
- Single URL input + "Scan" button
- Below the fold: brief "how it works" (3 steps) and a static sample report screenshot placeholder

On submit, POST to /api/scan which:
- Fetches the given URL server-side
- Parses the HTML for: title tag, meta description, OG tags, favicon link, viewport meta tag
- Fetches /robots.txt and /sitemap.xml from the same domain, checks they exist and robots.txt isn't blocking everything
- Checks the URL loads over HTTPS
- Checks for llms.txt at the domain root and whether robots.txt blocks common AI bots (GPTBot, ClaudeBot, Google-Extended)
- Scans footer/nav text for "privacy" and "terms" links
- Scores each check Pass/Warning/Critical, computes an overall 0-100 score
- Returns JSON: { score, topIssues: [3 issue titles only] }

Results page (/report/[id], client-side, no DB yet — just pass data via query param or in-memory for this phase):
- Big score badge (color-coded: green 80+, yellow 50-79, red <50)
- List of top 3 issues (title only, no detail)
- Locked/blurred section showing "7 more issues found" with a disabled "Unlock full report — $9" button (non-functional for now)

Keep styling clean and minimal — off-white background, one accent color, generous whitespace, monospace font for the score number. No auth needed yet. No database yet — this phase is pure scan-and-display.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8c06ea3c-ecd8-4746-b57b-91e4b7afeddf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
