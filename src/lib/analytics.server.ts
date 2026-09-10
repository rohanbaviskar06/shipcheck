// Server-only analytics + abuse-control helpers.

/** Stable, non-reversible visitor key derived from the request IP. */
export async function hashIp(ip: string): Promise<string> {
  const salt = process.env["SUPABASE_PROJECT_ID"] ?? "shipcheck";
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Fire-and-forget event log. Never throws — analytics must not break a request. */
export async function logEvent(name: string, meta: Record<string, unknown> = {}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("analytics_events").insert({ name, meta: meta as never });
  } catch (error) {
    console.error("[analytics] failed to log", name, error);
  }
}
