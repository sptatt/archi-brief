import { sendDigestsForSlot } from '../lib/digest.js';

export default async function handler(req, res) {
  // Auth: either Vercel Cron's bearer, or our manual secret param
  const cronAuth = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  const querySecret = (req.query.secret === process.env.CRON_SECRET);
  if (!cronAuth && !querySecret) return res.status(401).json({ error: 'unauthorized' });

  const slot = req.query.slot === 'evening' ? 'evening' : 'morning';
  try {
    const sent = await sendDigestsForSlot(slot);
    return res.status(200).json({ ok: true, slot, sent });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
