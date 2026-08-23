/**
 * Lead capture endpoint.
 *
 * The contact form's primary channel is WhatsApp, but that hop is fragile: a
 * popup blocker, a device with no WhatsApp installed, or a mistyped tap all end
 * with the enquiry going nowhere and no trace of it. This endpoint runs
 * alongside the WhatsApp hand-off so every submission leaves a record, whether
 * or not the customer ever reaches the chat.
 *
 * Delivery is env-gated and degrades quietly: Resend if configured, otherwise a
 * generic webhook, otherwise a log line that keeps the lead recoverable from
 * the platform logs. A missing channel must never fail the request, because the
 * WhatsApp hand-off may well have succeeded.
 */

export const config = { runtime: 'nodejs' };

type Payload = {
  name?: unknown;
  phone?: unknown;
  service?: unknown;
  message?: unknown;
  /** Honeypot. Real customers never fill this in. */
  website?: unknown;
};

const asString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

// Indian mobile numbers, tolerant of +91, spaces, and dashes.
const PHONE_RE = /^(\+?91[\s-]?)?[6-9]\d{9}$/;

const SERVICE_LABELS: Record<string, string> = {
  'land-buy-sell': 'Land Buying & Selling',
  plots: 'Plots Selling',
  'farm-land': 'Farm Land Selling',
  painting: 'Building Painting',
  'tree-cutting': 'Tree Cutting & Farm Land Tree Cutting',
  'land-cleaning': 'Vacant Land Cleaning & Sand',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  let body: Payload;
  try {
    // Request.json() is typed unknown; every field is re-validated below.
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Silently accept honeypot submissions so bots get no signal.
  if (asString(body.website)) return Response.json({ ok: true });

  const name = asString(body.name);
  const phone = asString(body.phone);
  const message = asString(body.message);
  const serviceKey = asString(body.service);
  const service = SERVICE_LABELS[serviceKey] ?? serviceKey ?? '';

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!PHONE_RE.test(phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Please enter a valid 10-digit mobile number.';
  }
  if (message.length > 5000) errors.message = 'Please keep it under 5000 characters.';

  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 422 });
  }

  const lead = {
    name,
    phone,
    service: service || 'Not specified',
    message,
    receivedAt: new Date().toISOString(),
  };

  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL;
  const webhook = process.env.LEAD_WEBHOOK_URL;

  try {
    if (resendKey && to && from) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `New enquiry: ${name} - ${lead.service}`,
          text: [
            `Name: ${name}`,
            `Phone: ${phone}`,
            `Service: ${lead.service}`,
            message ? `\nMessage:\n${message}` : null,
            `\nReceived: ${lead.receivedAt}`,
          ]
            .filter(Boolean)
            .join('\n'),
        }),
      });
      if (!response.ok) throw new Error(`Resend responded ${response.status}`);
    } else if (webhook) {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
    } else {
      console.warn('[lead] No delivery channel configured. Lead:', lead);
    }
  } catch (error) {
    // The customer may already be in WhatsApp, so a delivery failure here is
    // logged loudly for recovery but never surfaced as a failed submission.
    console.error('[lead] Delivery failed:', error, lead);
  }

  return Response.json({ ok: true });
}
