import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM || 'ARCHI Brief <onboarding@resend.dev>';

const CAT_LABEL = {
  design:'건축가·작품', material:'재료·자재', green:'친환경·지속가능', safety:'구조·소방·안전',
  policy:'법규·정책', tech:'기술·BIM·디지털', urban:'도시계획·재생', edu:'공모전·학술·교육'
};

function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pad(n,w=2){ return String(n).padStart(w,'0'); }

function digestHTML({ name, region, items, sheetNo, date }) {
  const isKr = region === 'kr';
  const isNow = region === 'now';
  const heading = isKr ? '오늘의 국내 건축 소식' : isNow ? '온디맨드 브리프' : "Today's Global Architecture";
  const scope   = isKr ? 'KOREA'   : isNow ? 'ON-DEMAND' : 'GLOBAL';
  const time    = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const dateStr = `${date.getFullYear()}.${pad(date.getMonth()+1)}.${pad(date.getDate())}`;

  const newsRows = items.map((it,i)=>`
    <tr><td style="padding:18px 0;border-top:1px solid #E8E3D5">
      <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;color:#9F9A91;letter-spacing:0.06em;margin-bottom:6px">${pad(i+1)} / ${pad(items.length)}</div>
      <div style="font-size:16px;font-weight:600;line-height:1.4;color:#0A0A0A;margin-bottom:8px">${esc(it.title)}</div>
      <div style="font-size:13px;color:#5A554E;line-height:1.55;margin-bottom:10px">${esc(it.excerpt||'')}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#9F9A91">
        <span>${esc(CAT_LABEL[it.category]||it.category)} · ${esc(it.source)}</span>
        ${it.url ? `<a href="${esc(it.url)}" style="color:#0A0A0A;font-weight:600;text-decoration:none;border-bottom:1px solid #0A0A0A;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.06em">READ →</a>` : ''}
      </div>
    </td></tr>`).join('');

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#FBF8F0;font-family:-apple-system,'Segoe UI',sans-serif">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FBF8F0;padding:32px 16px">
  <tr><td align="center">
    <table width="600" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border-radius:6px;overflow:hidden">
      <tr><td style="padding:32px 36px 0">
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:16px;border-bottom:2px solid #0A0A0A;font-weight:700;letter-spacing:0.22em;font-size:12px;color:#0A0A0A">
          <span>ARCHI · DAILY BRIEF</span>
          <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;color:#9F9A91;letter-spacing:0.14em;font-weight:500">${esc(sheetNo)}</span>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:20px 0 22px">
          <div style="font-size:13px;color:#5A554E;max-width:60%;line-height:1.6">
            ${esc(name||'')}님, 오늘의 <strong style="color:#0A0A0A">${esc(heading)}</strong> ${items.length}건을 정리해드립니다.
          </div>
          <table cellspacing="0" cellpadding="0" border="0" style="border:1px solid #0A0A0A;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;color:#0A0A0A">
            <tr><td style="padding:4px 9px;background:#FAF7EE;border-bottom:1px solid #D8D2C2;color:#9F9A91;text-align:right">DATE</td><td style="padding:4px 11px;border-bottom:1px solid #D8D2C2;border-left:1px solid #D8D2C2">${esc(dateStr)}</td></tr>
            <tr><td style="padding:4px 9px;background:#FAF7EE;border-bottom:1px solid #D8D2C2;color:#9F9A91;text-align:right">TIME</td><td style="padding:4px 11px;border-bottom:1px solid #D8D2C2;border-left:1px solid #D8D2C2">${esc(time)}</td></tr>
            <tr><td style="padding:4px 9px;background:#FAF7EE;border-bottom:1px solid #D8D2C2;color:#9F9A91;text-align:right">SCOPE</td><td style="padding:4px 11px;border-bottom:1px solid #D8D2C2;border-left:1px solid #D8D2C2">${esc(scope)}</td></tr>
            <tr><td style="padding:4px 9px;background:#FAF7EE;color:#9F9A91;text-align:right">NO.</td><td style="padding:4px 11px;border-left:1px solid #D8D2C2">${esc(sheetNo)}</td></tr>
          </table>
        </div>

        <table width="100%" cellspacing="0" cellpadding="0" border="0">${newsRows}</table>
      </td></tr>
      <tr><td style="padding:18px 36px;background:#FAF7EE;border-top:1px solid #D8D2C2;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;color:#9F9A91;text-align:center;line-height:1.65">
        ARCHI · 건축학도를 위한 매일의 브리프<br>
        수신 거부 / 설정 변경 → <a href="${esc(process.env.SITE_URL||'#')}" style="color:#9F9A91">${esc(process.env.SITE_URL||'archi-brief')}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function subjectFor(region, date) {
  const d = `${date.getFullYear()}.${pad(date.getMonth()+1)}.${pad(date.getDate())}`;
  if (region === 'kr')  return `[ARCHI ${d}] 오늘의 국내 건축 소식`;
  if (region === 'int') return `[ARCHI ${d}] Today's Global Architecture`;
  return `[ARCHI ${d}] 온디맨드 브리프`;
}

export async function sendDigest({ to, name, region, items }) {
  const date = new Date();
  const sheetNo = `A-${pad((date.getMonth()+1)*100 + date.getDate(), 4)}-${region==='kr'?'KR':region==='int'?'IN':'ND'}`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: subjectFor(region, date),
    html: digestHTML({ name, region, items, sheetNo, date }),
  });
}
