import { supabaseAdmin } from '../lib/supabase.js';

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return local[0] + '***@' + domain;
  return local.slice(0, 2) + '***@' + domain;
}

export default async function handler(req, res) {
  const name = (req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name_required' });
  if (name.length > 50) return res.status(400).json({ error: 'name_too_long' });

  try {
    // Find profiles with this name (case-insensitive exact match)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .ilike('name', name)
      .limit(5);

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ found: 0, results: [] });
    }

    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const users = userList?.users || [];
    const emailById = Object.fromEntries(users.map(u => [u.id, u.email]));

    const results = [];
    for (const p of profiles) {
      const email = emailById[p.id];
      if (email) results.push({ name: p.name, masked: maskEmail(email) });
    }

    return res.status(200).json({ found: results.length, results });
  } catch (e) {
    console.error('find-id error:', e);
    return res.status(500).json({ error: e.message });
  }
}
