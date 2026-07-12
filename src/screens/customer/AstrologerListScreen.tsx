import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { colors } from '../../theme';
import type { AstrologerWithProfile } from '../../types';

export function AstrologerListScreen({ navigation }: any) {
  const [astrologers, setAstrologers] = useState<AstrologerWithProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAstrologers = useCallback(async () => {
    const { data, error } = await supabase
      .from('astrologer_profiles')
      .select('*, profile:profiles(*)')
      .eq('is_approved', true)
      .order('is_online', { ascending: false })
      .order('rating_avg', { ascending: false });

    if (!error && data) {
      setAstrologers(data as unknown as AstrologerWithProfile[]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAstrologers();
    }, [fetchAstrologers])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAstrologers();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={astrologers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accentGold} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No astrologers available yet. Pull to refresh.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AstrologerDetail', { astrologerId: item.id })}
          >
            <View style={styles.cardTop}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{item.profile.full_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.profile.full_name}</Text>
                <Text style={styles.specializations} numberOfLines={1}>
                  {item.specializations.join(' · ') || 'Vedic Astrology'}
                </Text>
                <View style={styles.metaRow}>
                  <View style={[styles.statusDot, { backgroundColor: item.is_online ? colors.online : colors.offline }]} />
                  <Text style={styles.statusText}>{item.is_online ? 'Online' : 'Offline'}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.rating}>★ {item.rating_avg.toFixed(1)} ({item.rating_count})</Text>
                </View>
              </View>
              <Text style={styles.rate}>₹{item.per_minute_rate}/min</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid },
  list: { padding: 16, gap: 12 },
  empty: { color: colors.textTertiary, textAlign: 'center', marginTop: 60, fontSize: 14 },
  card: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgPanelRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitial: { color: colors.accentGold, fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 3 },
  specializations: { color: colors.textSecondary, fontSize: 12.5, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.textTertiary, fontSize: 11.5 },
  dot: { color: colors.textTertiary, fontSize: 11.5 },
  rating: { color: colors.textTertiary, fontSize: 11.5 },
  rate: { color: colors.accentGold, fontSize: 13.5, fontWeight: '600' },
});
