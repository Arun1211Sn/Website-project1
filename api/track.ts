/**
 * Contact tracking endpoint.
 *
 * Every WhatsApp tap, phone-call tap and enquiry-form send on the site posts a
 * small beacon here, so the owner can see how many people reached out through
 * the website and from which listing or button.
 *
 * Storage is env-gated like the lead endpoint: with SHEET_WEBHOOK_URL and
 * SHEET_WEBHOOK_SECRET set, each event is appended as a row to the owner's
 * Google Sheet (see apps-script/contact-log.gs); either way it is also written
 * to the platform logs as a single greppable "[contact]" line. Tracking must
 * never get in the way of the contact itself, so this always answers 204.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const TYPES = new Set(['whatsapp', 'call', 'form']);

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const header = (req: VercelRequest, name: string) => {
  const value = req.headers[name];
  return clip(Array.isArray(value) ? value[0] : value, 200);
};

const decodeCity = (raw: string) => {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  // sendBeacon posts the JSON as a Blob; depending on the browser it can
  // arrive already parsed or as a raw string.
  let body: Record<string, unknown> = {};
  if (typeof req.body === 'object' && req.body !== null) {
    body = req.body as Record<string, unknown>;
  } else if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      /* fall through to the type check below */
    }
  }

  const type = clip(body.type, 20);
  if (!TYPES.has(type)) {
    res.status(204).end();
    return;
  }

  const event = {
    type,
    source: clip(body.source, 200) || null,
    page: clip(body.page, 300) || null,
    referrer: clip(body.referrer, 300) || null,
    device: /Mobi|Android|iPhone|iPad/i.test(header(req, 'user-agent')) ? 'Mobile' : 'Desktop',
    // Vercel geo headers; the city arrives URI-encoded.
    country: header(req, 'x-vercel-ip-country') || null,
    city: decodeCity(header(req, 'x-vercel-ip-city')) || null,
  };

  console.log('[contact]', JSON.stringify(event));

  const url = process.env.SHEET_WEBHOOK_URL;
  const secret = process.env.SHEET_WEBHOOK_SECRET;
  if (url && secret) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, kind: 'contact', ...event }),
      });
      if (!response.ok) throw new Error(`Sheet responded ${response.status}`);
    } catch (error) {
      console.error('[contact] Store failed:', error);
    }
  }

  res.status(204).end();
}
