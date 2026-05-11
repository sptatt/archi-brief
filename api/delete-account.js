import { supabaseAdmin } from '../lib/supabase.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' });
  const token = authHeader.slice(7);

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  try {
    // 순서대로 삭제: 북마크 → 아카이브 → 프로필 → 인증 계정
    await supabaseAdmin.from('bookmarks').delete().eq('user_id', user.id);
    await supabaseAdmin.from('digests').delete().eq('user_id', user.id);
    await supabaseAdmin.from('profiles').delete().eq('id', user.id);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error('auth delete failed:', delErr);
      return res.status(500).json({ ok: false, error: delErr.message });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('delete-account error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
