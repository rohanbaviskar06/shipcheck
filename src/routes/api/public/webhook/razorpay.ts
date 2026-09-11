import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: { id?: string; order_id?: string; email?: string; notes?: { scan_id?: string } };
    };
  };
};

export const Route = createFileRoute("/api/public/webhook/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 500 });

        const body = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: RazorpayEvent;
        try {
          event = JSON.parse(body) as RazorpayEvent;
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        if (event.event !== "payment.captured" && event.event !== "order.paid") {
          return new Response("ignored");
        }

        const payment = event.payload?.payment?.entity;
        const paymentId = payment?.id;
        const orderId = payment?.order_id;
        const scanId = payment?.notes?.scan_id;
        if (!paymentId || (!orderId && !scanId)) return new Response("ignored");

        const effectiveEmail = payment?.email || payment?.notes?.email;
        let query = supabaseAdmin
          .from("scans")
          .update({
            paid: true,
            razorpay_payment_id: paymentId,
            ...(effectiveEmail ? { email: effectiveEmail } : {}),
          });
        query = orderId ? query.eq("razorpay_order_id", orderId) : query.eq("id", scanId!);
        const { data: updatedScan, error } = await query.select("id, url, score, email").maybeSingle();

        if (error) {
          console.error("[razorpay webhook] update failed", error.message);
          return new Response("Update failed", { status: 500 });
        }

        if (updatedScan?.email) {
          let host = updatedScan.url;
          try {
            host = new URL(updatedScan.url).host.replace(/^www\./, "");
          } catch {
            /* keep raw */
          }
          const origin = new URL(request.url).origin;
          const { sendReportLinkEmail } = await import("@/lib/email.server");
          await sendReportLinkEmail({
            to: updatedScan.email,
            reportUrl: `${origin}/report/${updatedScan.id}`,
            host,
            score: updatedScan.score,
          });
        }

        return new Response("ok");
      },
    },
  },
});
