import { createFileRoute } from "@tanstack/react-router";
import { renderScoreCard } from "@/lib/og-image.server";
import type { CheckResult } from "@/lib/scan.functions";

const UUID = /^[0-9a-f-]{36}$/i;

export const Route = createFileRoute("/api/public/report/$id/og-image")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!UUID.test(params.id)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("scans")
          .select("url, score, checks")
          .eq("id", params.id)
          .maybeSingle();

        if (!row) return new Response("Not found", { status: 404 });

        const checks = (row.checks ?? []) as unknown as CheckResult[];
        const png = await renderScoreCard({
          url: row.url,
          score: row.score,
          criticals: checks.filter((c) => c.status === "critical").length,
          warnings: checks.filter((c) => c.status === "warning").length,
          passes: checks.filter((c) => c.status === "pass").length,
        });

        return new Response(png as unknown as BodyInit, {
          headers: {
            "content-type": "image/png",
            "cache-control": "public, max-age=600, s-maxage=86400",
          },
        });
      },
    },
  },
});
