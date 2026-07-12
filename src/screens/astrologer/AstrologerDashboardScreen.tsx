import { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';
import type { AstrologerProfile, ChatSession, Profile } from '../../types';

interface RequestWithCustomer extends ChatSession {
  customer: Profile;
}

export function AstrologerDashboardScreen({ navigation }: any) {
  const { session } = useAuth();
  const [astroProfile, setAstroProfile] = useState<AstrologerProfile | null>(null);
  const [requests, setRequests] = useState<RequestWithCustomer[]>([]);
  const [toggling, setToggling] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('astrologer_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) setAstroProfile(data as AstrologerProfile);
  }, [session?.user]);

  const fetchRequests = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('chat_sessions')
      .select('*, customer:profiles!chat_sessions_customer_id_fkey(*)')
      .eq('astrologer_id', session.user.id)
      .eq('status', 'requested')
      .order('created_at', { ascending: false });
    if (data) setRequests(data as unknown as RequestWithCustomer[]);
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchRequests();
    }, [fetchProfile, fetchRequests])
  );

  // Realtime: new incoming chat requests.
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel(`astrologer-requests-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_sessions',
          filter: `astrologer_id=eq.${session.user.id}`,
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user, fetchRequests]);

  const handleToggleOnline = async (value: boolean) => {
    if (!session?.user || !astroProfile) return;

    if (!astroProfile.is_approved) {
      Alert.alert('Approval pending', 'Your account is awaiting admin approval before you can go online.');
      return;
    }

    setToggling(true);
    const { error } = await supabase
      .from('astrologer_profiles')
      .update({ is_online: value })
      .eq('id', session.user.id);
    setToggling(false);

    if (!error) {
      setAstroProfile({ ...astroProfile, is_online: value });
    }
  };

  const handleAccept = async (requestId: string) => {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', requestId);

    if (!error) {
      navigation.navigate('Chat', { sessionId: requestId });
    }
  };

  const handleReject = async (requestId: string) => {
    await supabase.from('chat_sessions').update({ status: 'rejected' }).eq('id', requestId);
    fetchRequests();
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusLabel}>You are</Text>
          <Text style={[styles.statusValue, { color: astroProfile?.is_online ? colors.online : colors.textTertiary }]}>
            {astroProfile?.is_online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Switch
          value={astroProfile?.is_online ?? false}
          onValueChange={handleToggleOnline}
          disabled={toggling}
          trackColor={{ false: colors.border, true: colors.accentGold }}
          thumbColor={colors.textPrimary}
        />
      </View>

      {astroProfile && !astroProfile.is_approved && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Your account is awaiting approval. You can't go online until an admin approves your profile.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Incoming requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.empty}>No pending requests right now.</Text>}
        renderItem={({ item }) => (
          <View style={styles.requestCard}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>{item.customer.full_name}</Text>
              <Text style={styles.requestTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item.id)}>
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(item.id)}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid, padding: 20 },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  statusLabel: { color: colors.textSecondary, fontSize: 12.5 },
  statusValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  warningBanner: {
    backgroundColor: 'rgba(212,168,87,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,87,0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningText: { color: colors.accentGold, fontSize: 12.5, lineHeight: 18 },
  sectionTitle: { color: colors.textPrimary, fontSize: 14.5, fontWeight: '600', marginBottom: 12 },
  empty: { color: colors.textTertiary, textAlign: 'center', marginTop: 30, fontSize: 13.5 },
  requestCard: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  requestInfo: { marginBottom: 12 },
  requestName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  requestTime: { color: colors.textTertiary, fontSize: 11.5, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 10 },
  rejectButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  rejectText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  acceptButton: { flex: 1, backgroundColor: colors.accentGold, borderRadius: 10, padding: 12, alignItems: 'center' },
  acceptText: { color: colors.bgVoid, fontSize: 13, fontWeight: '700' },
});
