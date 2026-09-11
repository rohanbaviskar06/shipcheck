import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CheckStatus } from "./scan.functions";

export type PdfReportData = {
  url: string;
  score: number;
  scannedAt: string;
  checks: Array<{
    name: string;
    status: CheckStatus;
    detail: string;
    fix?: string;
  }>;
};

export function sanitizeText(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u00B7/g, ".")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  max: number
) {
  const clean = sanitizeText(text);
  const words = clean.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    try {
      if (font.widthOfTextAtSize(next, size) > max && line) {
        lines.push(line);
        line = w;
      } else {
        line = next;
      }
    } catch {
      if (line) lines.push(line);
      line = "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateReportPdf(data: PdfReportData): Promise<Uint8Array> {
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
  page.drawText(sanitizeText(data.url).slice(0, 90), {
    x: left,
    y,
    size: 10,
    font: body,
    color: muted,
  });
  y -= 16;
  page.drawText(
    sanitizeText(
      `Score ${data.score}/100 - ${new Date(data.scannedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    ),
    {
      x: left,
      y,
      size: 10,
      font: bold,
      color: ink,
    }
  );
  y -= 20;
  page.drawLine({
    start: { x: left, y },
    end: { x: left + width, y },
    thickness: 0.6,
    color: muted,
  });
  y -= 22;

  const sortedChecks = [...data.checks].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, pass: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  for (const c of sortedChecks) {
    if (y < 90) break;
    page.drawText(sanitizeText(`${c.name} - ${c.status.toUpperCase()}`), {
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

  page.drawText("shipcheck - check before you ship", {
    x: left,
    y: 40,
    size: 8,
    font: body,
    color: muted,
  });

  return await pdf.save();
}

export function downloadPdfBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
