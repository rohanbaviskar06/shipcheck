import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestHost, getRequestProtocol } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SCANS_PER_HOUR = 5;

export type CheckStatus = "pass" | "warning" | "critical";

export type CheckResult = {
  id: string;
  name: string;
  status: CheckStatus;
  detail: string;
  fix: string;
  weight: number;
};

export type ScanResult = {
  id: string;
  url: string;
  score: number;
  checks: CheckResult[];
  scannedAt: string;
  paid: boolean;
  /** Absolute URL of this report's share image, for og:image / twitter:image. */
  ogImage: string;
};

function siteOrigin(): string {
  try {
    return `${getRequestProtocol()}://${getRequestHost({ xForwardedHost: true })}`;
  } catch {
    return "";
  }
}

function requestIp(): string {
  try {
    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    return (
      getRequestHeader("cf-connecting-ip") ??
      forwarded.split(",")[0]?.trim() ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function serverSupabase() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const UA = "ShipCheckBot/1.0 (+pre-launch site checker)";

async function safeFetch(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "*/*" },
      signal: controller.signal,
    });
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, text, contentType: res.headers.get("content-type") ?? "" };
  } catch {
    return { ok: false, status: 0, text: "", contentType: "" };
  } finally {
    clearTimeout(timer);
  }
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? "").trim();
}

function metaContent(html: string, key: "name" | "property", value: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const k = attr(tag, key);
    if (k && k.toLowerCase() === value.toLowerCase()) return attr(tag, "content");
  }
  return null;
}

function linkHrefByRel(html: string, relMatch: RegExp): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = attr(tag, "rel");
    if (rel && relMatch.test(rel)) return attr(tag, "href");
  }
  return null;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function robotsBlocksAll(robots: string): boolean {
  const lines = robots.split(/\r?\n/).map((l) => l.trim());
  let inStar = false;
  for (const line of lines) {
    if (/^user-agent:/i.test(line)) inStar = /^user-agent:\s*\*$/i.test(line);
    else if (inStar && /^disallow:\s*\/\s*$/i.test(line)) return true;
  }
  return false;
}

function robotsBlocksBot(robots: string, bot: string): boolean {
  const lines = robots.split(/\r?\n/).map((l) => l.trim());
  let inBot = false;
  for (const line of lines) {
    if (/^user-agent:/i.test(line)) {
      inBot = line.slice(11).trim().toLowerCase() === bot.toLowerCase();
    } else if (inBot && /^disallow:\s*\/\s*$/i.test(line)) return true;
  }
  return false;
}

function footerRegion(html: string): string {
  const footer = html.match(/<footer[\s\S]*?<\/footer>/gi)?.join(" ") ?? "";
  const nav = html.match(/<nav[\s\S]*?<\/nav>/gi)?.join(" ") ?? "";
  return `${footer} ${nav}` || html;
}

export const runScan = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data || typeof data.url !== "string" || data.url.trim().length < 3) {
      throw new Error("Please enter a website address.");
    }
    return { url: data.url.trim() };
  })
  .handler(async ({ data }): Promise<ScanResult> => {
    const input = normalizeUrl(data.url);
    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      throw new Error("That doesn't look like a valid website address.");
    }

    const { hashIp, logEvent } = await import("@/lib/analytics.server");
    const ipHash = await hashIp(requestIp());
    const supabase = serverSupabase();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if ((recent ?? 0) >= SCANS_PER_HOUR) {
      await logEvent("scan_rate_limited", { ipHash });
      throw new Error(
        `You've run ${SCANS_PER_HOUR} scans in the past hour — the limit resets shortly. Try again later.`,
      );
    }

    const page = await safeFetch(parsed.toString());
    if (!page.ok || !page.text) {
      throw new Error("We couldn't load that page. Check the address and try again.");
    }
    const html = page.text;
    const origin = parsed.origin;

    const [robots, sitemap, llms] = await Promise.all([
      safeFetch(`${origin}/robots.txt`),
      safeFetch(`${origin}/sitemap.xml`),
      safeFetch(`${origin}/llms.txt`),
    ]);

    const checks: CheckResult[] = [];
    const add = (c: CheckResult) => checks.push(c);

    // 1. Title
    const titleRaw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
    if (!titleRaw) {
      add({ id: "title", name: "Page title", status: "critical", weight: 12, detail: "No title tag found on the page.", fix: "Add a <title> tag in the page head, 10–60 characters, leading with your main keyword." });
    } else if (titleRaw.length < 10 || titleRaw.length > 60) {
      add({ id: "title", name: "Page title", status: "warning", weight: 12, detail: `Title is ${titleRaw.length} characters ("${titleRaw.slice(0, 80)}").`, fix: "Rewrite the title to sit between 10 and 60 characters so search results don't truncate it." });
    } else {
      add({ id: "title", name: "Page title", status: "pass", weight: 12, detail: `"${titleRaw}" (${titleRaw.length} characters).`, fix: "" });
    }

    // 2. Meta description
    const desc = metaContent(html, "name", "description")?.replace(/\s+/g, " ").trim() ?? "";
    if (!desc) {
      add({ id: "description", name: "Meta description", status: "critical", weight: 10, detail: "No meta description found.", fix: 'Add <meta name="description" content="..."> with a 50–160 character summary of the page.' });
    } else if (desc.length < 50 || desc.length > 160) {
      add({ id: "description", name: "Meta description", status: "warning", weight: 10, detail: `Description is ${desc.length} characters.`, fix: "Trim or expand the description to 50–160 characters." });
    } else {
      add({ id: "description", name: "Meta description", status: "pass", weight: 10, detail: `${desc.length} characters, within the ideal range.`, fix: "" });
    }

    // 3. Open Graph
    const ogImage = metaContent(html, "property", "og:image");
    const ogTitle = metaContent(html, "property", "og:title");
    const ogDesc = metaContent(html, "property", "og:description");
    const missingOg = [
      !ogTitle && "og:title",
      !ogDesc && "og:description",
      !ogImage && "og:image",
    ].filter(Boolean) as string[];
    if (missingOg.length === 3) {
      add({ id: "og", name: "Social sharing preview", status: "critical", weight: 10, detail: "No Open Graph tags found, so shared links show no preview.", fix: "Add og:title, og:description and og:image (1200×630 absolute URL) meta tags." });
    } else if (missingOg.length > 0) {
      add({ id: "og", name: "Social sharing preview", status: "warning", weight: 10, detail: `Missing: ${missingOg.join(", ")}.`, fix: `Add the missing tags: ${missingOg.join(", ")}. Use an absolute https URL for the image.` });
    } else {
      add({ id: "og", name: "Social sharing preview", status: "pass", weight: 10, detail: "og:title, og:description and og:image are all present.", fix: "" });
    }

    // 4. Favicon
    const iconHref = linkHrefByRel(html, /icon/i);
    let faviconOk = false;
    let faviconDetail = "";
    if (iconHref) {
      const abs = new URL(iconHref, parsed).toString();
      const r = await safeFetch(abs, 8000);
      faviconOk = r.ok;
      faviconDetail = r.ok ? `Icon loads from ${abs}.` : `Declared icon ${abs} did not load (status ${r.status || "no response"}).`;
    } else {
      const r = await safeFetch(`${origin}/favicon.ico`, 8000);
      faviconOk = r.ok;
      faviconDetail = r.ok ? "Found /favicon.ico but it isn't declared in the page head." : "No favicon declared and /favicon.ico is missing.";
    }
    add({
      id: "favicon",
      name: "Favicon",
      status: faviconOk && iconHref ? "pass" : faviconOk ? "warning" : "warning",
      weight: 6,
      detail: faviconDetail,
      fix: faviconOk && iconHref ? "" : 'Add an icon file and declare it: <link rel="icon" href="/favicon.ico">.',
    });

    // 5. robots.txt
    if (!robots.ok || !robots.text.trim()) {
      add({ id: "robots", name: "robots.txt", status: "warning", weight: 8, detail: "No robots.txt found at the site root.", fix: "Add a robots.txt that allows crawling and points to your sitemap." });
    } else if (robotsBlocksAll(robots.text)) {
      add({ id: "robots", name: "robots.txt", status: "critical", weight: 8, detail: "robots.txt blocks every crawler with 'Disallow: /'.", fix: "Remove the site-wide Disallow: / rule before launch, or search engines will never index you." });
    } else {
      add({ id: "robots", name: "robots.txt", status: "pass", weight: 8, detail: "robots.txt exists and does not block the whole site.", fix: "" });
    }

    // 6. sitemap.xml
    const sitemapFromRobots = robots.text.match(/^sitemap:\s*(\S+)/im)?.[1];
    if (sitemap.ok && /<urlset|<sitemapindex/i.test(sitemap.text)) {
      add({ id: "sitemap", name: "Sitemap", status: "pass", weight: 8, detail: "sitemap.xml is reachable and looks valid.", fix: "" });
    } else if (sitemapFromRobots) {
      add({ id: "sitemap", name: "Sitemap", status: "warning", weight: 8, detail: `No /sitemap.xml, but robots.txt points to ${sitemapFromRobots}.`, fix: "Also serve the sitemap at /sitemap.xml — many tools look there first." });
    } else {
      add({ id: "sitemap", name: "Sitemap", status: "critical", weight: 8, detail: "No sitemap found at /sitemap.xml and none listed in robots.txt.", fix: "Generate a sitemap.xml listing your public pages and reference it from robots.txt." });
    }

    // 7. HTTPS
    if (parsed.protocol === "https:") {
      add({ id: "https", name: "HTTPS", status: "pass", weight: 12, detail: "The page is served securely over HTTPS.", fix: "" });
    } else {
      const secure = await safeFetch(`https://${parsed.host}${parsed.pathname}`, 8000);
      add({
        id: "https",
        name: "HTTPS",
        status: "critical",
        weight: 12,
        detail: secure.ok ? "The page was requested over HTTP; HTTPS works but isn't enforced." : "The site does not serve a working HTTPS version.",
        fix: "Install a valid SSL certificate and redirect all HTTP traffic to HTTPS.",
      });
    }

    // 8. Viewport
    const viewport = metaContent(html, "name", "viewport");
    if (!viewport) {
      add({ id: "viewport", name: "Mobile viewport", status: "critical", weight: 10, detail: "No viewport meta tag, so the page won't scale on phones.", fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
    } else if (!/width\s*=\s*device-width/i.test(viewport)) {
      add({ id: "viewport", name: "Mobile viewport", status: "warning", weight: 10, detail: `Viewport is set to "${viewport}".`, fix: 'Use content="width=device-width, initial-scale=1" for correct mobile scaling.' });
    } else {
      add({ id: "viewport", name: "Mobile viewport", status: "pass", weight: 10, detail: "Viewport is configured for mobile devices.", fix: "" });
    }

    // 9. AI crawler access
    const aiBots = ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot"];
    const blocked = robots.ok ? aiBots.filter((b) => robotsBlocksBot(robots.text, b)) : [];
    const hasLlms = llms.ok && llms.text.trim().length > 0;
    if (blocked.length > 0) {
      add({ id: "ai", name: "AI crawler visibility", status: "critical", weight: 12, detail: `robots.txt blocks ${blocked.join(", ")}.`, fix: "Remove those Disallow rules if you want to appear in AI answers, and add an llms.txt describing your product." });
    } else if (!hasLlms) {
      add({ id: "ai", name: "AI crawler visibility", status: "warning", weight: 12, detail: "AI crawlers aren't blocked, but there's no llms.txt at the site root.", fix: "Add /llms.txt with a plain-text summary of your product, key pages and contact details." });
    } else {
      add({ id: "ai", name: "AI crawler visibility", status: "pass", weight: 12, detail: "AI crawlers are allowed and llms.txt is present.", fix: "" });
    }

    // 10. Legal pages
    const region = footerRegion(html);
    const hasPrivacy = /privacy/i.test(region);
    const hasTerms = /\bterms\b|terms of service|terms & conditions|terms and conditions/i.test(region);
    if (!hasPrivacy && !hasTerms) {
      add({ id: "legal", name: "Legal pages", status: "critical", weight: 12, detail: "No privacy policy or terms links found in the navigation or footer.", fix: "Publish a privacy policy and terms page, then link both from the footer." });
    } else if (!hasPrivacy || !hasTerms) {
      add({ id: "legal", name: "Legal pages", status: "warning", weight: 12, detail: `Found ${hasPrivacy ? "privacy" : "terms"} but not ${hasPrivacy ? "terms" : "privacy"}.`, fix: `Add the missing ${hasPrivacy ? "terms" : "privacy policy"} page and link it in the footer.` });
    } else {
      add({ id: "legal", name: "Legal pages", status: "pass", weight: 12, detail: "Privacy and terms links were both detected.", fix: "" });
    }

    const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
    const earned = checks.reduce(
      (s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warning" ? 0.5 : 0),
      0,
    );
    let score = Math.round((earned / totalWeight) * 100);
    if (checks.some((c) => c.status === "critical")) score = Math.min(score, 69);

    const url = parsed.toString();
    const supabase = serverSupabase();
    const { data: row, error } = await supabase
      .from("scans")
      .insert({ url, score, checks })
      .select("id, created_at, paid")
      .single();

    if (error || !row) {
      throw new Error("We finished the scan but couldn't save the report. Please try again.");
    }

    return {
      id: row.id,
      url,
      score,
      checks,
      scannedAt: row.created_at,
      paid: row.paid,
    };
  });

export const getScan = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    const id = typeof data?.id === "string" ? data.id.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Report not found.");
    return { id };
  })
  .handler(async ({ data }): Promise<ScanResult | null> => {
    const supabase = serverSupabase();
    const { data: row, error } = await supabase
      .from("scans")
      .select("id, url, score, checks, paid, created_at")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !row) return null;

    return {
      id: row.id,
      url: row.url,
      score: row.score,
      checks: (row.checks ?? []) as unknown as CheckResult[],
      scannedAt: row.created_at,
      paid: row.paid,
    };
  });
