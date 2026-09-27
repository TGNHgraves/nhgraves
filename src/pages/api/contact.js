// Contact form endpoint: the one on-demand route on this otherwise static site.
// Validates the message and forwards it to n8n, which emails Tim and logs it to the leads sheet.
export const prerender = false;

const TOPICS = {
  renting: 'Renting a home',
  selling: 'Selling a property',
  renovation: 'A renovation project',
  other: 'Something else',
};

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Strip HTML (these fields land in an HTML email) and collapse whitespace
const clean = (value, max) =>
  String(value ?? '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid request.' });
  }

  // Honeypot: people never see the "company" field, bots fill it in
  if (body.company) return json(200, { ok: true });

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const phone = clean(body.phone, 30);
  const topic = Object.hasOwn(TOPICS, body.topic) ? body.topic : 'other';
  const message = String(body.message ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);
  const source_page = clean(body.source_page, 100);

  if (!name) return json(422, { error: 'Please enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(422, { error: 'Please enter a valid email address.' });
  if (!message) return json(422, { error: 'Please enter a message.' });

  const webhook = import.meta.env.N8N_CONTACT_WEBHOOK_URL;
  if (!webhook) {
    console.error('[contact] N8N_CONTACT_WEBHOOK_URL is not set');
    return json(502, { error: "We couldn't send your message." });
  }

  const payload = {
    timestamp: new Date().toISOString(),
    name,
    email,
    phone,
    topic,
    topic_label: TOPICS[topic],
    message,
    source_page,
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`n8n responded ${res.status}`);
  } catch (err) {
    console.error('[contact] Forwarding to n8n failed:', err?.message ?? err);
    return json(502, { error: "We couldn't send your message." });
  }

  return json(200, { ok: true });
}
