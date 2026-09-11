// Server-only: transactional email utility for report delivery and recovery.

interface SendReportLinkParams {
  to: string;
  reportUrl: string;
  host: string;
  score?: number;
  isRecovery?: boolean;
}

export async function sendReportLinkEmail({
  to,
  reportUrl,
  host,
  score,
  isRecovery = false,
}: SendReportLinkParams): Promise<{ ok: boolean; provider: string }> {
  const subject = isRecovery
    ? `Your recovered ShipCheck report for ${host}`
    : `Your ShipCheck full report for ${host}${typeof score === "number" ? ` (${score}/100)` : ""}`;

  const textBody = `
Here is your direct link to the ShipCheck report for ${host}:
${reportUrl}

Keep this link bookmarked — this report is permanently unlocked and you can re-scan your URL for free anytime you make changes.

— ShipCheck
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf8f3; color: #2e2a26; margin: 0; padding: 40px 20px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e4ddd2; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="padding: 24px 32px; border-bottom: 1px solid #e4ddd2; background-color: #ffffff;">
        <span style="font-family: monospace; font-size: 18px; font-weight: bold; color: #2e2a26;">
          ship<span style="color: #e2562b;">check</span>
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #2e2a26;">
          ${isRecovery ? "Recovered Report Link" : "Your Unlocked Pre-Launch Report"}
        </h1>
        <p style="font-size: 15px; line-height: 1.6; color: #554f47; margin: 0 0 24px 0;">
          Here is your permanent link for <strong>${host}</strong>${typeof score === "number" ? ` (Score: <strong>${score}/100</strong>)` : ""}. All 10 check fix guides are unlocked.
        </p>
        <div style="margin: 28px 0;">
          <a href="${reportUrl}" style="background-color: #e2562b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
            View Full Report &rarr;
          </a>
        </div>
        <p style="font-size: 13px; color: #8c8276; margin: 20px 0 0 0; line-height: 1.5;">
          Direct link: <a href="${reportUrl}" style="color: #e2562b; word-break: break-all;">${reportUrl}</a>
        </p>
        <p style="font-size: 13px; color: #8c8276; margin: 12px 0 0 0; line-height: 1.5;">
          Tip: You can re-scan ${host} for free anytime after applying fixes to verify improvements.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f7f4ed; border-top: 1px solid #e4ddd2; font-size: 12px; color: #8c8276;">
        No password or login needed. Keep this email for future reference.
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  // 1. Try Resend if API key is present
  const resendKey = process.env["RESEND_API_KEY"];
  if (resendKey) {
    try {
      const from = process.env["RESEND_FROM"] || "ShipCheck <reports@shipcheck.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        return { ok: true, provider: "resend" };
      }
      console.warn("[email] Resend API responded with status", res.status, await res.text());
    } catch (err) {
      console.error("[email] Resend send failed:", err);
    }
  }

  // 2. Fallback / Dev mode: Log clearly to console
  console.log(`\n================== [SHIPCHECK EMAIL DELIVERY] ==================`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Report Link: ${reportUrl}`);
  console.log(`=================================================================\n`);

  return { ok: true, provider: "console" };
}
