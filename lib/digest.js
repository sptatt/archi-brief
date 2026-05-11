import { supabaseAdmin } from './supabase.js';
import { sendDigestEmail } from './resend.js';
import { fetchAllFeeds } from './crawl.js';

export async function refreshNews() {
  const items = await fetchAllFeeds();
  if (!items.length) return 0;
  const { error } = await supabaseAdmin
    .from('news_items')
    .upsert(items, { onConflict: 'url', ignoreDuplicates: true });
  if (error) { console.error('upsert err', error); return 0; }
  return items.length;
}

export function buildDigestHtml({ name, region, items, dateStr }) {
  const rows = items.map((it, i) => `
    <tr><td style="padding:20px 0;border-top:1px solid #E8E3D5;">
      <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#9F9A91;letter-spacing:0.06em;margin-bottom:6px">
        ${String(i+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}
      </div>
      <div style="font-size:16px;font-weight:600;line-height:1.4;margin-bottom:8px;color:#0A0A0A;letter-spacing:-0.015em">
        ${escapeHtml(it.title)}
      </div>
      <div style="font-size:13px;color:#5A554E;line-height:1.55;margin-bottom:10px">
        ${escapeHtml(it.excerpt || '')}
      </div>
      <div style="font-size:11px;color:#9F9A91">
        ${escapeHtml(it.category || '')} · ${escapeHtml(it.source || '')}
        <a href="${it.url}" style="color:#0A0A0A;font-weight:600;margin-left:8px;text-decoration:none;border-bottom:1px solid #0A0A0A">원문 →</a>
      </div>
    </td></tr>`).join('');

  return `
  <div style="background:#FBF8F0;padding:32px 0;font-family:Helvetica,Arial,sans-serif">
    <table style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #D8D2C2;border-radius:4px;padding:36px;color:#0A0A0A" cellpadding="0" cellspacing="0">
      <tr><td>
        <div style="font-weight:700;letter-spacing:0.22em;font-size:12px;padding-bottom:18px;border-bottom:2px solid #0A0A0A;display:flex;justify-content:space-between">
          <span>ARCHI · DAILY BRIEF</span>
          <span style="font-family:ui-monospace,monospace;font-weight:500;color:#9F9A91;letter-spacing:0.14em">${dateStr}</span>
        </div>
        <p style="font-size:13px;color:#5A554E;margin:22px 0 4px;line-height:1.6">
          안녕하세요${name ? ' <strong style="color:#0A0A0A">' + escapeHtml(name) + '</strong>님' : ''}.
          오늘의 <strong style="color:#0A0A0A">${region}</strong> 건축 소식 ${items.length}건을 정리해드립니다.
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:10px">${rows}</table>
        <div style="margin-top:30px;padding-top:16px;border-top:1px solid #D8D2C2;font-family:ui-monospace,monospace;font-size:11px;color:#9F9A91;text-align:center;letter-spacing:0.04em">
          ARCHI · 건축학도를 위한 매일의 브리프
        </div>
      </td></tr>
    </table>
  </div>`;
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

export async function sendDigestsForSlot(slot) {
  await refreshNews();

  const region = slot === 'morning' ? 'kr' : 'int';

  // pull recent items in this region
  const { data: news } = await supabaseAdmin
    .from('news_items')
    .select('*')
    .eq('region', region)
    .order('published_at', { ascending: false })
    .limit(80);

  // get all active profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles').select('id, name, categories, paused');

  // get all user emails (auth schema)
  const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
  const users = userList?.users || [];
  const emailById = Object.fromEntries(users.map(u => [u.id, u.email]));

  const today = new Date().toLocaleDateString('ko-KR').replace(/\. ?/g,'.').replace(/\.$/,'');
  let sent = 0;
  for (const p of profiles || []) {
    if (p.paused) continue;
    const email = emailById[p.id];
    if (!email) continue;
    const filtered = (news || []).filter(n =>
      !p.categories?.length || p.categories.includes(n.category)
    ).slice(0, 5);
    if (!filtered.length) continue;

    const html = buildDigestHtml({
      name: p.name,
      region: region === 'kr' ? '국내' : '해외',
      items: filtered,
      dateStr: today,
    });

    try {
      await sendDigestEmail({
        to: email,
        subject: `[ARCHI] ${region === 'kr' ? '국내' : '해외'} 건축 브리프 — ${today}`,
        html,
      });
      await supabaseAdmin.from('digests').insert({
        user_id: p.id, slot, region, items: filtered,
      });
      sent++;
    } catch (e) {
      console.error('send failed', email, e.message);
    }
  }
  return sent;
}
