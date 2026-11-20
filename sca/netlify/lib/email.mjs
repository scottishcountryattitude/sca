// Sends emails through Resend (resend.com). Needs RESEND_API_KEY in Netlify > Environment variables,
// and the domain scottishcountryattitude.co.uk verified in Resend.
// MAIL_FROM can change the sender, e.g. "Scottish Country Attitude <orders@scottishcountryattitude.co.uk>".
import { shopSettings } from "./shop.mjs";

export const emailConfigured = () => !!String(process.env.RESEND_API_KEY || "").trim();

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Wraps content in a simple branded email layout.
export function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#17231d;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#17231d;color:#efe7d8;padding:16px 20px;border-radius:6px 6px 0 0;font-size:18px;font-weight:bold;">Scottish Country Attitude</div>
  <div style="background:#ffffff;padding:20px;border-radius:0 0 6px 6px;line-height:1.5;font-size:15px;">
    <h2 style="margin:0 0 12px;font-size:20px;">${esc(title)}</h2>
    ${bodyHtml}
  </div>
  <p style="font-size:12px;color:#6b6b6b;text-align:center;margin-top:14px;">scottishcountryattitude.co.uk</p>
</div></body></html>`;
}

// Returns true if sent. Never throws: a failed email must not lose an order.
export async function sendEmail({ to, subject, html, replyTo }) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key || !to) return false;
  const from = String(process.env.MAIL_FROM || "Scottish Country Attitude <orders@scottishcountryattitude.co.uk>").trim();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject: String(subject).slice(0, 200),
        html,
        reply_to: replyTo || shopSettings().email,
      }),
    });
    if (!res.ok) console.error("Email failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Email failed", e.message);
    return false;
  }
}

export const sendToShop = (subject, html, replyTo) => sendEmail({ to: shopSettings().email, subject, html, replyTo });
