import { createFileRoute } from "@tanstack/react-router";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Check = { name: string; status: string; detail: string; fix: string };

const UUID = /^[0-9a-f-]{36}$/i;

function wrap(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, max: number) {
  const words = (text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const Route = createFileRoute("/api/public/report/$id/pdf")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id?.trim() ?? "";
        if (!UUID.test(id)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: scan } = await supabaseAdmin
          .from("scans")
          .select("id, url, score, checks, paid, created_at")
          .eq("id", id)
          .maybeSingle();

        if (!scan) return new Response("Not found", { status: 404 });
        if (!scan.paid) return new Response("This report is locked", { status: 403 });

        const checks = ((scan.checks ?? []) as unknown as Check[]).slice().sort((a, b) => {
          const order: Record<string, number> = { critical: 0, warning: 1, pass: 2 };
          return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });

        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595, 842]);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
        const body = await pdf.embedFont(StandardFonts.Helvetica);
        const ink = rgb(0.09, 0.09, 0.1);
        const muted = rgb(0.42, 0.42, 0.45);
        const colors: Record<string, ReturnType<typeof rgb>> = {
          pass: rgb(0.13, 0.55, 0.33),
          warning: rgb(0.75, 0.52, 0.05),
          critical: rgb(0.78, 0.19, 0.19),
        };

        let y = 790;
        const left = 48;
        const width = 595 - left * 2;

        page.drawText("ShipCheck report", { x: left, y, size: 20, font: bold, color: ink });
        y -= 22;
        page.drawText(scan.url.slice(0, 90), { x: left, y, size: 10, font: body, color: muted });
        y -= 16;
        page.drawText(`Score ${scan.score}/100  ·  ${new Date(scan.created_at).toUTCString()}`, {
          x: left,
          y,
          size: 10,
          font: bold,
          color: ink,
        });
        y -= 20;
        page.drawLine({ start: { x: left, y }, end: { x: left + width, y }, thickness: 0.6, color: muted });
        y -= 22;

        for (const c of checks) {
          if (y < 90) break;
          page.drawText(`${c.name} — ${c.status.toUpperCase()}`, {
            x: left,
            y,
            size: 10.5,
            font: bold,
            color: colors[c.status] ?? ink,
          });
          y -= 13;
          for (const line of wrap(c.detail, body, 9, width)) {
            if (y < 70) break;
            page.drawText(line, { x: left, y, size: 9, font: body, color: ink });
            y -= 11;
          }
          if (c.fix) {
            for (const line of wrap(`Fix: ${c.fix}`, body, 9, width - 10)) {
              if (y < 70) break;
              page.drawText(line, { x: left + 10, y, size: 9, font: body, color: muted });
              y -= 11;
            }
          }
          y -= 8;
        }

        page.drawText("shipcheck · check before you ship", {
          x: left,
          y: 40,
          size: 8,
          font: body,
          color: muted,
        });

        const bytes = await pdf.save();
        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `attachment; filename="shipcheck-${id.slice(0, 8)}.pdf"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
