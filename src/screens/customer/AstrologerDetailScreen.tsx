import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../hooks/useWallet';
import { colors } from '../../theme';
import type { AstrologerWithProfile, Review } from '../../types';

export function AstrologerDetailScreen({ route, navigation }: any) {
  const { astrologerId } = route.params;
  const { session } = useAuth();
  const { wallet } = useWallet();
  const [astrologer, setAstrologer] = useState<AstrologerWithProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('astrologer_profiles')
        .select('*, profile:profiles(*)')
        .eq('id', astrologerId)
        .single();
      if (data) setAstrologer(data as unknown as AstrologerWithProfile);

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*')
        .eq('astrologer_id', astrologerId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (reviewData) setReviews(reviewData as Review[]);
    })();
  }, [astrologerId]);

  const handleStartChat = async () => {
    if (!astrologer || !session?.user) return;

    if (!astrologer.is_online) {
      Alert.alert('Astrologer offline', 'This astrologer is not available right now.');
      return;
    }

    if (!wallet || wallet.balance < astrologer.per_minute_rate) {
      Alert.alert(
        'Insufficient balance',
        `You need at least ₹${astrologer.per_minute_rate} to start this chat. Please recharge your wallet.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Recharge', onPress: () => navigation.navigate('Wallet') },
        ]
      );
      return;
    }

    setStarting(true);
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        customer_id: session.user.id,
        astrologer_id: astrologer.id,
        per_minute_rate: astrologer.per_minute_rate,
        status: 'requested',
      })
      .select()
      .single();
    setStarting(false);

    if (error || !data) {
      Alert.alert('Could not start chat', error?.message ?? 'Please try again.');
      return;
    }

    navigation.navigate('Chat', { sessionId: data.id });
  };

  if (!astrologer) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accentGold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{astrologer.profile.full_name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{astrologer.profile.full_name}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.statusDot, { backgroundColor: astrologer.is_online ? colors.online : colors.offline }]} />
          <Text style={styles.statusText}>{astrologer.is_online ? 'Online now' : 'Offline'}</Text>
        </View>
        <Text style={styles.rating}>★ {astrologer.rating_avg.toFixed(1)} · {astrologer.rating_count} reviews · {astrologer.experience_years} yrs exp</Text>
      </View>

      {astrologer.bio && <Text style={styles.bio}>{astrologer.bio}</Text>}

      {astrologer.specializations.length > 0 && (
        <View style={styles.chipRow}>
          {astrologer.specializations.map((s) => (
            <View key={s} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.rateCard}>
        <Text style={styles.rateLabel}>Consultation rate</Text>
        <Text style={styles.rateValue}>₹{astrologer.per_minute_rate}/min</Text>
      </View>

      {reviews.length > 0 && (
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Recent reviews</Text>
          {reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <Text style={styles.reviewRating}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
              {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.startButton, !astrologer.is_online && styles.startButtonDisabled]}
        onPress={handleStartChat}
        disabled={starting || !astrologer.is_online}
      >
        {starting ? (
          <ActivityIndicator color={colors.bgVoid} />
        ) : (
          <Text style={styles.startButtonText}>
            {astrologer.is_online ? 'Start Chat' : 'Astrologer Offline'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid },
  loading: { flex: 1, backgroundColor: colors.bgVoid, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgPanelRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  avatarInitial: { color: colors.accentGold, fontSize: 28, fontWeight: '700' },
  name: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.textSecondary, fontSize: 12.5 },
  rating: { color: colors.textTertiary, fontSize: 12.5 },
  bio: { color: colors.textSecondary, fontSize: 14.5, lineHeight: 21, marginBottom: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: colors.bgPanel, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  rateCard: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rateLabel: { color: colors.textSecondary, fontSize: 13.5 },
  rateValue: { color: colors.accentGold, fontSize: 18, fontWeight: '700' },
  reviewsSection: { marginBottom: 24 },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  reviewCard: { backgroundColor: colors.bgPanel, borderRadius: 12, padding: 12, marginBottom: 8 },
  reviewRating: { color: colors.accentGold, fontSize: 13, marginBottom: 4 },
  reviewComment: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  startButton: { backgroundColor: colors.accentGold, borderRadius: 14, padding: 17, alignItems: 'center' },
  startButtonDisabled: { backgroundColor: colors.border },
  startButtonText: { color: colors.bgVoid, fontSize: 15.5, fontWeight: '700' },
});
