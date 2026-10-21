/**
 * Scrolling updates and new-project alerts.
 *
 * The owner edits the "Updates" tab of the contact-log Google Sheet; the Apps
 * Script web app (apps-script/contact-log.gs, doGet) returns its visible rows.
 * This endpoint relays them to the site and lets Vercel's edge cache the
 * answer for five minutes, so the sheet is read a few times an hour rather
 * than on every page view. Pages ship with the current messages baked in, so
 * a failure here only means visitors keep seeing those.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

type Update = { date: string; message: string; link: string; type: 'new' | 'update' };

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

// Links come from a sheet several people may edit, so only site-relative paths
// and https URLs are passed through.
const safeLink = (value: unknown) => {
  const link = clip(value, 300);
  return /^\/(?!\/)/.test(link) || /^https:\/\//.test(link) ? link : '';
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url) {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(200).json({ updates: [] });
    return;
  }

  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Sheet responded ${response.status}`);
    const data = (await response.json()) as { updates?: unknown[] };

    const updates: Update[] = (Array.isArray(data.updates) ? data.updates : [])
      .map((raw) => {
        const row = (raw ?? {}) as Record<string, unknown>;
        return {
          date: clip(row.date, 10),
          message: clip(row.message, 200),
          link: safeLink(row.link),
          type: row.type === 'new' ? ('new' as const) : ('update' as const),
        };
      })
      .filter((u) => u.message)
      // Newest first; on the same day, new projects lead.
      .sort((a, b) => b.date.localeCompare(a.date) || (a.type === 'new' ? -1 : 1) - (b.type === 'new' ? -1 : 1))
      .slice(0, 10);

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ updates });
  } catch (error) {
    console.error('[updates] Fetch failed:', error);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(502).json({ updates: [] });
  }
}
