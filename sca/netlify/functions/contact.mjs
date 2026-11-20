import { shopStore, json, cleanText, rateLimit, isEmail, shopSettings } from "../lib/shop.mjs";
import { sendEmail, sendToShop, layout, esc, emailConfigured } from "../lib/email.mjs";
import { randomBytes } from "node:crypto";

// Contact form: saved for Admin, and emailed to the shop when email is set up.
export const TOPICS = ["General question", "Idea for a T-shirt or hoodie", "Question about my order", "Wholesale / bulk order", "Other"];

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const store = shopStore();
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (b.website) return json({ ok: true });
  if (!(await rateLimit(store, context.ip || "unknown", "contact", 8))) return json({ error: "Too many messages from this connection. Please try later." }, 429);
  const name = cleanText(b.name, 60), email = String(b.email || "").trim().slice(0, 200), phone = cleanText(b.phone, 30);
  const topic = TOPICS.includes(b.topic) ? b.topic : "General question";
  const message = String(b.message || "").replace(/[<>]/g, "").trim().slice(0, 2000);
  if (!name || !isEmail(email)) return json({ error: "Please add your name and a valid email address." }, 400);
  if (message.length < 5) return json({ error: "Please write a short message." }, 400);

  const msg = { id: "m" + Date.now() + randomBytes(3).toString("hex"), date: new Date().toISOString(), name, email, phone, topic, message };
  const list = (await store.get("messages", { type: "json" })) || [];
  list.unshift(msg);
  await store.setJSON("messages", list.slice(0, 300));

  await sendToShop(`Website message: ${topic}, from ${name}`, layout(topic, `
    <p><b>${esc(name)}</b> &lt;${esc(email)}&gt; ${esc(phone)}</p>
    <p style="white-space:pre-wrap;">${esc(message)}</p><p class="s">Reply to this email to answer them.</p>`), email);
  await sendEmail({ to: email, subject: "We've got your message", html: layout(`Thanks ${name}`, `
    <p>Thanks for getting in touch with Scottish Country Attitude. We'll get back to you as soon as we can.</p>
    <p style="white-space:pre-wrap;color:#555;border-left:3px solid #ddd;padding-left:10px;">${esc(message)}</p>
    <p>For a complaint, please email <a href="mailto:${esc(shopSettings().complaintsEmail)}">${esc(shopSettings().complaintsEmail)}</a>.</p>`) });
  return json({ ok: true, emailOn: emailConfigured() });
};
export const config = { path: "/api/contact" };
