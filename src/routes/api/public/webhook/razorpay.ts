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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let query = supabaseAdmin
          .from("scans")
          .update({
            paid: true,
            razorpay_payment_id: paymentId,
            ...(payment?.email ? { email: payment.email } : {}),
          });
        query = orderId ? query.eq("razorpay_order_id", orderId) : query.eq("id", scanId!);
        const { error } = await query;

        if (error) {
          console.error("[razorpay webhook] update failed", error.message);
          return new Response("Update failed", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
