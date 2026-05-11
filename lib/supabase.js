import { createClient } from '@supabase/supabase-js';

// Server-side admin client (use only inside /api). NEVER expose service_role on the frontend.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
