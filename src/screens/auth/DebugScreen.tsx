import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../../services/supabase';
import { colors } from '../../theme';

/**
 * Temporary diagnostic screen — not part of the normal app flow. Lets us see
 * exactly what config is baked into this build and what a real Supabase
 * request returns, all rendered on-screen instead of relying on dev tools
 * (useful when testing from a phone with no console access).
 *
 * Safe to delete once the signup issue is resolved.
 */
export function DebugScreen() {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (line: string) => setLog((prev) => [...prev, line]);

  const configUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '(not set)';
  const configKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '(not set)';

  const runTest = async () => {
    setLog([]);
    addLog(`URL: ${configUrl}`);
    addLog(`Key (first 20 chars): ${configKey.slice(0, 20)}...`);
    addLog(`Key length: ${configKey.length}`);
    addLog('---');
    addLog('Attempting raw fetch to Supabase health endpoint...');

    try {
      const healthUrl = `${configUrl}/auth/v1/health`;
      const res = await fetch(healthUrl, {
        headers: { apikey: configKey },
      });
      addLog(`Health check status: ${res.status}`);
      const text = await res.text();
      addLog(`Health check body: ${text.slice(0, 300)}`);
    } catch (err: any) {
      addLog(`Health check THREW: ${err?.name ?? 'Unknown'} — ${err?.message ?? String(err)}`);
      addLog(`Full error dump: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
    }

    addLog('---');
    addLog('Attempting supabase.auth.signUp()...');

    try {
      const testEmail = `debugtest${Date.now()}@example.com`;
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123',
        options: { data: { full_name: 'Debug Test', role: 'customer' } },
      });

      if (error) {
        addLog(`signUp() returned error:`);
        addLog(`  name: ${error.name}`);
        addLog(`  message: ${error.message}`);
        addLog(`  status: ${error.status}`);
        addLog(`  full dump: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      } else {
        addLog(`signUp() SUCCESS`);
        addLog(`  user id: ${data.user?.id ?? '(none)'}`);
        addLog(`  session: ${data.session ? 'present' : 'null (email confirmation likely required)'}`);
      }
    } catch (err: any) {
      addLog(`signUp() THREW (not a normal AuthError):`);
      addLog(`  name: ${err?.name ?? 'Unknown'}`);
      addLog(`  message: ${err?.message ?? '(no message property)'}`);
      addLog(`  toString: ${err?.toString?.() ?? '(no toString)'}`);
      addLog(`  full dump: ${JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}))}`);
    }

    addLog('---');
    addLog('Done.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Debug: Supabase Connection</Text>

      <TouchableOpacity style={styles.button} onPress={runTest}>
        <Text style={styles.buttonText}>Run Diagnostic Test</Text>
      </TouchableOpacity>

      <View style={styles.logBox}>
        {log.length === 0 ? (
          <Text style={styles.logEmpty}>Tap the button above to run the test.</Text>
        ) : (
          log.map((line, i) => (
            <Text key={i} style={styles.logLine} selectable>
              {line}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid },
  content: { padding: 20, paddingBottom: 60 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  button: {
    backgroundColor: colors.accentGold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: colors.bgVoid, fontWeight: '700', fontSize: 15 },
  logBox: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  logEmpty: { color: colors.textTertiary, fontSize: 13 },
  logLine: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
    lineHeight: 17,
  },
});
