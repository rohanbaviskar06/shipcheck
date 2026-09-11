import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestProtocol } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "crypto";

export type Currency = "INR" | "USD";

export const PRICES: Record<Currency, { amount: number; label: string }> = {
  INR: { amount: 29900, label: "₹299" },
  USD: { amount: 900, label: "$9" },
};

const UUID = /^[0-9a-f-]{36}$/i;

function siteOrigin(): string {
  try {
    return `${getRequestProtocol()}://${getRequestHost({ xForwardedHost: true })}`;
  } catch {
    return "";
  }
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; currency: Currency; email: string }) => {
    const id = typeof data?.id === "string" ? data.id.trim() : "";
    if (!UUID.test(id)) throw new Error("Report not found.");
    const currency: Currency = data?.currency === "USD" ? "USD" : "INR";
    const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
      throw new Error("Please enter a valid email address to receive your report.");
    }
    return { id, currency, email };
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
    if (scan.paid) return { alreadyPaid: true as const, email: data.email };

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
        notes: { scan_id: data.id, email: data.email },
      }),
    });

    if (!res.ok) {
      console.error("[razorpay] order create failed", res.status, await res.text());
      throw new Error("We couldn't start the payment. Please try again.");
    }

    const order = (await res.json()) as { id: string };
    await supabaseAdmin
      .from("scans")
      .update({
        razorpay_order_id: order.id,
        currency: data.currency,
        amount,
        email: data.email,
      })
      .eq("id", data.id);

    return {
      alreadyPaid: false as const,
      orderId: order.id,
      amount,
      currency: data.currency,
      keyId,
      email: data.email,
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; orderId: string; paymentId: string; signature: string; email?: string }) => {
      const id = typeof data?.id === "string" ? data.id.trim() : "";
      if (!UUID.test(id)) throw new Error("Report not found.");
      const pick = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 128) : "");
      const orderId = pick(data?.orderId);
      const paymentId = pick(data?.paymentId);
      const signature = pick(data?.signature);
      const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : undefined;
      if (!orderId || !paymentId || !signature) throw new Error("Payment details are incomplete.");
      return { id, orderId, paymentId, signature, email };
    },
  )
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
    const updatePayload: Record<string, unknown> = {
      paid: true,
      razorpay_payment_id: data.paymentId,
    };
    if (data.email) {
      updatePayload.email = data.email;
    }

    const { error } = await supabaseAdmin
      .from("scans")
      .update(updatePayload)
      .eq("id", data.id)
      .eq("razorpay_order_id", data.orderId);

    if (error) throw new Error("Payment went through but unlocking failed. Refresh in a moment.");

    // Retrieve scan info to send receipt & link email
    const { data: scanRow } = await supabaseAdmin
      .from("scans")
      .select("id, url, score, email")
      .eq("id", data.id)
      .maybeSingle();

    const recipient = data.email || scanRow?.email;
    if (recipient && scanRow) {
      let host = scanRow.url;
      try {
        host = new URL(scanRow.url).host.replace(/^www\./, "");
      } catch {
        /* keep raw */
      }
      const origin = siteOrigin();
      const reportUrl = `${origin}/report/${scanRow.id}`;
      const { sendReportLinkEmail } = await import("@/lib/email.server");
      await sendReportLinkEmail({
        to: recipient,
        reportUrl,
        host,
        score: scanRow.score,
      });
    }

    return { paid: true, email: recipient };
  });

