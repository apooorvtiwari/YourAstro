// Supabase Edge Function: bill-active-sessions
// Meant to run on a schedule (Supabase Cron, every 1 minute). Finds all
// 'active' chat sessions and deducts one minute's charge from each, ending
// any session whose customer wallet hits zero.
//
// Set up the schedule in Supabase Dashboard → Edge Functions → bill-active-sessions
// → Cron: every minute ("* * * * *"), or via CLI: supabase functions deploy
// + a cron trigger using pg_cron calling this function's URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: activeSessions, error } = await supabase
    .from('chat_sessions')
    .select('id, customer_id')
    .eq('status', 'active');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: Record<string, string> = {};

  for (const session of activeSessions ?? []) {
    try {
      const { data: newBalance, error: deductErr } = await supabase.rpc('deduct_for_chat_minute', {
        p_session_id: session.id,
      });

      if (deductErr) {
        results[session.id] = `error: ${deductErr.message}`;
        continue;
      }

      if (newBalance !== null && Number(newBalance) <= 0) {
        await supabase
          .from('chat_sessions')
          .update({ status: 'ended', ended_at: new Date().toISOString(), ended_reason: 'low_balance' })
          .eq('id', session.id);
        results[session.id] = 'ended: low_balance';
      } else {
        results[session.id] = 'charged';
      }
    } catch (err) {
      results[session.id] = `exception: ${String(err)}`;
    }
  }

  return new Response(JSON.stringify({ processed: activeSessions?.length ?? 0, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
