import { supabaseAdmin } from '../lib/supabase.js';
import { sendDigestEmail } from '../lib/resend.js';
import { buildDigestHtml } from '../lib/digest.js';
import { fetchAllFeeds } from '../lib/crawl.js';

export default async function handler(req, res) {
  // Need user JWT in Authorization header
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  const token = authHeader.slice(7);

  // Verify the token via Supabase
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  try {
    // Refresh news from RSS feeds (best-effort)
    try {
      const items = await fetchAllFeeds();
      if (items.length) {
        await supabaseAdmin.from('news_items').upsert(items, { onConflict: 'url', ignoreDuplicates: true });
      }
    } catch (e) { console.warn('refresh failed', e.message); }

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('*').eq('id', user.id).single();

    // Pick recent items matching categories (mix of regions)
    const { data: news } = await supabaseAdmin
      .from('news_items').select('*')
      .order('published_at', { ascending: false }).limit(120);

    const cats = profile?.categories || [];
    const filtered = (news || [])
      .filter(n => !cats.length || cats.includes(n.category))
      .slice(0, 5);

    if (!filtered.length) {
      return res.status(200).json({ ok: true, sent: 0, reason: 'no matching news' });
    }

    const today = new Date().toLocaleDateString('ko-KR');
    const html = buildDigestHtml({
      name: profile?.name,
      region: '온디맨드',
      items: filtered,
      dateStr: today,
    });

    await sendDigestEmail({
      to: user.email,
      subject: `[ARCHI] 즉시 발송 브리프 — ${today}`,
      html,
    });

    await supabaseAdmin.from('digests').insert({
      user_id: user.id,
      slot: 'now',
      region: 'now',
      items: filtered,
    });

    return res.status(200).json({ ok: true, sent: 1, count: filtered.length });
  } catch (e) {
    console.error('digest-now error', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
