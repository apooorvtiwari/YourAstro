import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';
import { showAlert } from '../../utils/showAlert';
import type { AstrologerProfile, ChatSession } from '../../types';

export function AstrologerEarningsScreen() {
  const { session, signOut } = useAuth();
  const [astroProfile, setAstroProfile] = useState<AstrologerProfile | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [completedSessions, setCompletedSessions] = useState<ChatSession[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;

    const { data: profileData } = await supabase
      .from('astrologer_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      setAstroProfile(profileData as AstrologerProfile);
      setRateInput(String(profileData.per_minute_rate));
    }

    const { data: sessionsData } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('astrologer_id', session.user.id)
      .eq('status', 'ended')
      .order('ended_at', { ascending: false })
      .limit(30);

    if (sessionsData) setCompletedSessions(sessionsData as ChatSession[]);
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const totalEarnings = completedSessions.reduce((sum, s) => sum + s.total_charged, 0);

  const handleSaveRate = async () => {
    if (!session?.user) return;
    const rate = parseFloat(rateInput);
    if (!rate || rate <= 0) {
      showAlert('Invalid rate', 'Enter a valid per-minute rate.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('astrologer_profiles')
      .update({ per_minute_rate: rate })
      .eq('id', session.user.id);
    setSaving(false);

    if (error) {
      showAlert('Update failed', error.message);
    } else {
      showAlert('Saved', 'Your rate has been updated.');
      fetchData();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Total earnings (completed sessions)</Text>
        <Text style={styles.earningsValue}>₹{totalEarnings.toFixed(2)}</Text>
        <Text style={styles.earningsNote}>
          Payouts are processed manually for now — contact admin to withdraw.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Your rate</Text>
      <View style={styles.rateRow}>
        <Text style={styles.rateCurrency}>₹</Text>
        <TextInput
          style={styles.rateInput}
          value={rateInput}
          onChangeText={setRateInput}
          keyboardType="decimal-pad"
        />
        <Text style={styles.ratePerMin}>/min</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRate} disabled={saving}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Session history</Text>
      <FlatList
        data={completedSessions}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={<Text style={styles.empty}>No completed sessions yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.sessionRow}>
            <View>
              <Text style={styles.sessionDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              <Text style={styles.sessionDuration}>{item.total_minutes} min</Text>
            </View>
            <Text style={styles.sessionAmount}>₹{item.total_charged.toFixed(2)}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid, padding: 20 },
  earningsCard: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },
  earningsLabel: { color: colors.textSecondary, fontSize: 12.5, marginBottom: 6, textAlign: 'center' },
  earningsValue: { color: colors.accentGold, fontSize: 32, fontWeight: '700', marginBottom: 8 },
  earningsNote: { color: colors.textTertiary, fontSize: 11, textAlign: 'center' },
  sectionTitle: { color: colors.textPrimary, fontSize: 14.5, fontWeight: '600', marginBottom: 12 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  rateCurrency: { color: colors.textPrimary, fontSize: 16 },
  rateInput: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 15,
    width: 90,
  },
  ratePerMin: { color: colors.textSecondary, fontSize: 13, marginRight: 'auto' },
  saveButton: { backgroundColor: colors.accentGold, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 18 },
  saveButtonText: { color: colors.bgVoid, fontWeight: '700', fontSize: 13 },
  empty: { color: colors.textTertiary, textAlign: 'center', marginTop: 20, fontSize: 13.5 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  sessionDate: { color: colors.textPrimary, fontSize: 14 },
  sessionDuration: { color: colors.textTertiary, fontSize: 11.5, marginTop: 2 },
  sessionAmount: { color: colors.online, fontSize: 14.5, fontWeight: '600' },
  signOutButton: { marginTop: 24, alignItems: 'center', padding: 14 },
  signOutText: { color: colors.accentRed, fontSize: 13.5, fontWeight: '600' },
});
