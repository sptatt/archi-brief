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

  try {
    // 새 기사 크롤 (실패해도 계속)
    try {
      const items = await fetchAllFeeds();
      if (items.length) {
        await supabaseAdmin.from('news_items').upsert(items, { onConflict: 'url', ignoreDuplicates: true });
      }
    } catch (e) { console.warn('crawl failed:', e.message); }

    // 프로필
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('*').eq('id', user.id).single();
    const cats = profile?.categories || [];

    // 이 사용자가 최근 받은 기사 URL (중복 방지)
    const { data: prev } = await supabaseAdmin
      .from('digests').select('items').eq('user_id', user.id)
      .order('sent_at', { ascending: false }).limit(30);
    const sentUrls = new Set();
    for (const d of prev || []) for (const it of (d.items || [])) if (it.url) sentUrls.add(it.url);

    // 양쪽 지역에서 따로 가져오기 (한쪽이 풍부해도 다른 쪽이 묻히지 않게)
    const { data: krNews } = await supabaseAdmin
      .from('news_items').select('*').eq('region', 'kr')
      .order('published_at', { ascending: false }).limit(100);
    const { data: intNews } = await supabaseAdmin
      .from('news_items').select('*').eq('region', 'int')
      .order('published_at', { ascending: false }).limit(100);

    const matchCat = n => !cats.length || cats.includes(n.category);
    const krFresh  = (krNews  || []).filter(matchCat).filter(n => !sentUrls.has(n.url));
    const intFresh = (intNews || []).filter(matchCat).filter(n => !sentUrls.has(n.url));

    // 국내·해외 번갈아가며 최대 5건
    const filtered = [];
    let i = 0;
    while (filtered.length < 5 && (i < krFresh.length || i < intFresh.length)) {
      if (i < krFresh.length && filtered.length < 5) filtered.push(krFresh[i]);
      if (i < intFresh.length && filtered.length < 5) filtered.push(intFresh[i]);
      i++;
    }

    // 새 기사 부족하면 fallback — 이미 받은 거 허용
    if (filtered.length === 0) {
      const allMatch = [...(krNews||[]), ...(intNews||[])].filter(matchCat);
      filtered.push(...allMatch.slice(0, 5));
    }

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

    const krCount = filtered.filter(it => it.region === 'kr').length;
    const intCount = filtered.filter(it => it.region === 'int').length;
    return res.status(200).json({ ok: true, sent: 1, kr: krCount, int: intCount });
  } catch (e) {
    console.error('digest-now error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
