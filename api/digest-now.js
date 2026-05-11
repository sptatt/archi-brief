import { supabaseAdmin } from '../lib/supabase.js';
import { sendDigestEmail } from '../lib/resend.js';
import { buildDigestHtml } from '../lib/digest.js';
import { fetchAllFeeds } from '../lib/crawl.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' });
  const token = authHeader.slice(7);

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  // slot 파라미터: kr / int / mix
  const slot = (req.query.slot === 'kr' || req.query.slot === 'int') ? req.query.slot : 'mix';

  try {
    // 크롤 (실패해도 진행)
    try {
      const items = await fetchAllFeeds();
      if (items.length) {
        await supabaseAdmin.from('news_items').upsert(items, { onConflict: 'url', ignoreDuplicates: true });
      }
    } catch (e) { console.warn('crawl failed:', e.message); }

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    const cats = profile?.categories || [];

    // 이미 보낸 url
    const { data: prev } = await supabaseAdmin
      .from('digests').select('items').eq('user_id', user.id)
      .order('sent_at', { ascending: false }).limit(30);
    const sentUrls = new Set();
    for (const d of prev || []) for (const it of (d.items || [])) if (it.url) sentUrls.add(it.url);

    const matchCat = n => !cats.length || cats.includes(n.category);

    async function pickFromRegion(region, want) {
      const { data } = await supabaseAdmin
        .from('news_items').select('*').eq('region', region)
        .order('published_at', { ascending: false }).limit(150);
      const matched = (data || []).filter(matchCat);
      const fresh = matched.filter(n => !sentUrls.has(n.url));
      const out = fresh.slice(0, want);
      if (out.length < want) {
        const used = new Set(out.map(x => x.url));
        for (const it of matched) {
          if (out.length >= want) break;
          if (!used.has(it.url)) out.push(it);
        }
      }
      return out;
    }

    let filtered = [];
    if (slot === 'kr') {
      filtered = await pickFromRegion('kr', 5);
    } else if (slot === 'int') {
      filtered = await pickFromRegion('int', 5);
    } else {
      const kr = await pickFromRegion('kr', 3);
      const int = await pickFromRegion('int', 5 - kr.length);
      filtered = [...kr, ...int];
      if (filtered.length < 5) {
        const extra = await pickFromRegion('kr', 5 - filtered.length);
        const used = new Set(filtered.map(x => x.url));
        for (const it of extra) if (!used.has(it.url) && filtered.length < 5) filtered.push(it);
      }
    }

    if (!filtered.length) {
      return res.status(200).json({ ok: true, sent: 0, reason: 'no matching news for slot=' + slot });
    }

    const today = new Date().toLocaleDateString('ko-KR');
    const regionLabel = slot === 'kr' ? '국내' : slot === 'int' ? '해외' : '국내·해외';
    const html = buildDigestHtml({
      name: profile?.name,
      region: regionLabel,
      items: filtered,
      dateStr: today,
    });

    await sendDigestEmail({
      to: user.email,
      subject: `[ARCHI] ${regionLabel} 즉시 브리프 — ${today}`,
      html,
    });

    await supabaseAdmin.from('digests').insert({
      user_id: user.id,
      slot: 'now',
      region: slot === 'mix' ? 'now' : slot,
      items: filtered,
    });

    const krCount = filtered.filter(it => it.region === 'kr').length;
    const intCount = filtered.filter(it => it.region === 'int').length;
    return res.status(200).json({ ok: true, sent: 1, slot, kr: krCount, int: intCount });
  } catch (e) {
    console.error('digest-now error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
