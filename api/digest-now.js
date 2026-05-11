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
    // 새 기사 크롤 (실패해도 계속 진행)
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

    // 이 사용자가 최근 받은 기사 URL들 (중복 방지)
    const { data: prevDigests } = await supabaseAdmin
      .from('digests').select('items').eq('user_id', user.id)
      .order('sent_at', { ascending: false }).limit(30);
    const sentUrls = new Set();
    for (const d of prevDigests || []) {
      for (const it of (d.items || [])) {
        if (it.url) sentUrls.add(it.url);
      }
    }

    // 최근 기사 (양쪽 지역 다)
    const { data: news } = await supabaseAdmin
      .from('news_items').select('*')
      .order('published_at', { ascending: false }).limit(200);

    // 카테고리 매칭 + 이미 받은 거 제외
    const byCat = (news || []).filter(n => !cats.length || cats.includes(n.category));
    const fresh = byCat.filter(n => !sentUrls.has(n.url));

    // 새 기사 부족하면 (혹은 0개면) 그냥 카테고리 매칭만 사용 (재발송 OK)
    const pool = fresh.length >= 5 ? fresh : byCat;
    const filtered = pool.slice(0, 5);

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

    return res.status(200).json({ ok: true, sent: 1, count: filtered.length, fresh_count: fresh.length });
  } catch (e) {
    console.error('digest-now error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
