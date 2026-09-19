import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env first, with fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.warn('[START Server] WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Server admin features are restricted.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Health check and connection verification endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const tableChecks: Record<string, { ok: boolean; count?: number; error?: string }> = {};
    const tables = [
      'profiles',
      'onboarding_profiles',
      'assignments',
      'milestones',
      'tasks',
      'work_slots',
      'work_sessions',
      'distractions',
      'daily_reviews',
      'observed_patterns',
    ];

    for (const table of tables) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) {
        tableChecks[table] = { ok: false, error: error.message };
      } else {
        tableChecks[table] = { ok: true, count: count || 0 };
      }
    }

    res.json({
      status: 'ok',
      service: 'START Backend API',
      timestamp: new Date().toISOString(),
      supabaseConnected: Boolean(supabaseUrl && serviceRoleKey),
      tables: tableChecks,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err.message || 'Internal server error',
    });
  }
});

// Admin stats endpoint (requires service role key)
app.get('/api/stats', async (_req, res) => {
  try {
    const { data: users, error: userErr } = await supabaseAdmin.auth.admin.listUsers();
    const { count: slotsCount } = await supabaseAdmin
      .from('work_slots')
      .select('*', { count: 'exact', head: true });
    const { count: assignmentsCount } = await supabaseAdmin
      .from('assignments')
      .select('*', { count: 'exact', head: true });
    const { count: sessionsCount } = await supabaseAdmin
      .from('work_sessions')
      .select('*', { count: 'exact', head: true });

    res.json({
      userCount: userErr ? 'restricted' : users?.users?.length || 0,
      totalSlots: slotsCount || 0,
      totalAssignments: assignmentsCount || 0,
      totalSessions: sessionsCount || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User Registration endpoint (Admin auto-confirm, bypasses Supabase rate-limited SMTP)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const formattedEmail = email.trim().toLowerCase();
    const name = displayName?.trim() || formattedEmail.split('@')[0];

    // Create user in auth.users with email_confirm = true so no verification email is triggered
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: formattedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        display_name: name,
      },
    });

    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (msg.includes('already exists') || msg.includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      }
      return res.status(400).json({ error: createErr.message });
    }

    if (!created.user) {
      return res.status(500).json({ error: 'Failed to create user account.' });
    }

    // Initialize public.profiles row
    await supabaseAdmin.from('profiles').upsert({
      id: created.user.id,
      display_name: name,
      theme: 'dark',
      sound_enabled: true,
      is_onboarding_completed: false,
    });

    res.status(201).json({
      status: 'created',
      user: {
        id: created.user.id,
        email: created.user.email,
        displayName: name,
      },
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Server error during signup.' });
  }
});

// User data export / backup endpoint
app.get('/api/user/backup/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const [slots, assignments, sessions, reviews, distractions, profile] = await Promise.all([
      supabaseAdmin.from('work_slots').select('*').eq('user_id', userId),
      supabaseAdmin.from('assignments').select('*, milestones(*)').eq('user_id', userId),
      supabaseAdmin.from('work_sessions').select('*').eq('user_id', userId),
      supabaseAdmin.from('daily_reviews').select('*').eq('user_id', userId),
      supabaseAdmin.from('distractions').select('*').eq('user_id', userId),
      supabaseAdmin.from('onboarding_profiles').select('*').eq('id', userId).single(),
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      userId,
      profile: profile.data || null,
      workSlots: slots.data || [],
      assignments: assignments.data || [],
      workSessions: sessions.data || [],
      dailyReviews: reviews.data || [],
      distractions: distractions.data || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[START Server] Running on http://localhost:${PORT}`);
  console.log(`[START Server] Supabase URL: ${supabaseUrl}`);
});
