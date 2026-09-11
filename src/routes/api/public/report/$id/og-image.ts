import { createFileRoute } from "@tanstack/react-router";
import { renderScoreCard, renderProgressCard } from "@/lib/og-image.server";
import type { CheckResult } from "@/lib/scan.functions";

const UUID = /^[0-9a-f-]{36}$/i;

export const Route = createFileRoute("/api/public/report/$id/og-image")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!UUID.test(params.id)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("scans")
          .select("id, url, score, checks, created_at, previous_scan_id")
          .eq("id", params.id)
          .maybeSingle();

        if (!row) return new Response("Not found", { status: 404 });

        const urlObj = new URL(request.url);
        const isProgress = urlObj.searchParams.get("type") === "progress";

        if (isProgress) {
          let prevScore: number | null = null;
          if (urlObj.searchParams.has("prev")) {
            const parsed = parseInt(urlObj.searchParams.get("prev")!, 10);
            if (!Number.isNaN(parsed)) prevScore = parsed;
          }

          if (prevScore === null && row.previous_scan_id) {
            const { data: prevRow } = await supabaseAdmin
              .from("scans")
              .select("score")
              .eq("id", row.previous_scan_id)
              .maybeSingle();
            if (prevRow) prevScore = prevRow.score;
          }

          if (prevScore === null) {
            // Find earlier scan for this URL
            const { data: prevRow } = await supabaseAdmin
              .from("scans")
              .select("score")
              .eq("url", row.url)
              .lt("created_at", row.created_at)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (prevRow) prevScore = prevRow.score;
          }

          if (prevScore !== null) {
            const png = await renderProgressCard({
              url: row.url,
              prevScore,
              newScore: row.score,
            });
            return new Response(png as unknown as BodyInit, {
              headers: {
                "content-type": "image/png",
                "cache-control": "public, max-age=600, s-maxage=86400",
              },
            });
          }
        }

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

