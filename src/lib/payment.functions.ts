import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "crypto";

export type Currency = "INR" | "USD";

export const PRICES: Record<Currency, { amount: number; label: string }> = {
  INR: { amount: 29900, label: "₹299" },
  USD: { amount: 900, label: "$9" },
};

const UUID = /^[0-9a-f-]{36}$/i;

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; currency: Currency }) => {
    const id = typeof data?.id === "string" ? data.id.trim() : "";
    if (!UUID.test(id)) throw new Error("Report not found.");
    const currency: Currency = data?.currency === "USD" ? "USD" : "INR";
    return { id, currency };
  })
  .handler(async ({ data }) => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !keySecret) throw new Error("Payments aren't configured yet.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: scan } = await supabaseAdmin
      .from("scans")
      .select("id, url, paid")
      .eq("id", data.id)
      .maybeSingle();
    if (!scan) throw new Error("Report not found.");
    if (scan.paid) return { alreadyPaid: true as const };

    const amount = PRICES[data.currency].amount;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount,
        currency: data.currency,
        receipt: data.id.slice(0, 40),
        notes: { scan_id: data.id },
      }),
    });

    if (!res.ok) {
      console.error("[razorpay] order create failed", res.status, await res.text());
      throw new Error("We couldn't start the payment. Please try again.");
    }

    const order = (await res.json()) as { id: string };
    await supabaseAdmin
      .from("scans")
      .update({ razorpay_order_id: order.id, currency: data.currency, amount })
      .eq("id", data.id);

    return {
      alreadyPaid: false as const,
      orderId: order.id,
      amount,
      currency: data.currency,
      keyId,
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; orderId: string; paymentId: string; signature: string }) => {
    const id = typeof data?.id === "string" ? data.id.trim() : "";
    if (!UUID.test(id)) throw new Error("Report not found.");
    const pick = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 128) : "");
    const orderId = pick(data?.orderId);
    const paymentId = pick(data?.paymentId);
    const signature = pick(data?.signature);
    if (!orderId || !paymentId || !signature) throw new Error("Payment details are incomplete.");
    return { id, orderId, paymentId, signature };
  })
  .handler(async ({ data }) => {
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keySecret) throw new Error("Payments aren't configured yet.");

    const expected = createHmac("sha256", keySecret)
      .update(`${data.orderId}|${data.paymentId}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("We couldn't verify that payment.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("scans")
      .update({ paid: true, razorpay_payment_id: data.paymentId })
      .eq("id", data.id)
      .eq("razorpay_order_id", data.orderId);

    if (error) throw new Error("Payment went through but unlocking failed. Refresh in a moment.");
    return { paid: true };
  });
