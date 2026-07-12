import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { colors } from '../../theme';

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export function WalletScreen() {
  const { wallet, transactions, refresh } = useWallet();
  const { session } = useAuth();
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleRecharge = async (amount: number) => {
    if (!session) return;
    setProcessing(true);

    try {
      // Step 1: create order server-side (Edge Function) so amount can't be tampered with.
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'razorpay-create-order',
        { body: { amount } }
      );

      if (orderError || !orderData) {
        throw new Error(orderError?.message ?? 'Could not create order');
      }

      // Step 2: open Razorpay checkout.
      const checkoutOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'AstroTalk MVP',
        description: 'Wallet Recharge',
        prefill: {
          email: session.user.email ?? '',
        },
        theme: { color: colors.accentGold },
      };

      const paymentResult = await RazorpayCheckout.open(checkoutOptions);

      // Step 3: verify signature + credit wallet server-side.
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'razorpay-verify-payment',
        {
          body: {
            razorpay_order_id: paymentResult.razorpay_order_id,
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_signature: paymentResult.razorpay_signature,
          },
        }
      );

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyError?.message ?? 'Payment verification failed');
      }

      Alert.alert('Success', `₹${amount} added to your wallet.`);
      await refresh();
    } catch (err: any) {
      // Razorpay throws with a `description` field on user cancellation.
      const message = err?.description || err?.message || 'Payment could not be completed.';
      if (message !== 'Payment cancelled by user' && !message.toLowerCase().includes('cancel')) {
        Alert.alert('Payment failed', message);
      }
    } finally {
      setProcessing(false);
      setCustomAmount('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceValue}>₹{wallet?.balance.toFixed(2) ?? '0.00'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Quick recharge</Text>
      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={styles.quickButton}
            onPress={() => handleRecharge(amt)}
            disabled={processing}
          >
            <Text style={styles.quickButtonText}>₹{amt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          placeholder="Custom amount"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          value={customAmount}
          onChangeText={setCustomAmount}
        />
        <TouchableOpacity
          style={styles.customButton}
          onPress={() => {
            const amt = parseInt(customAmount, 10);
            if (amt >= 50) {
              handleRecharge(amt);
            } else {
              Alert.alert('Minimum amount', 'Please enter at least ₹50.');
            }
          }}
          disabled={processing}
        >
          {processing ? <ActivityIndicator color={colors.bgVoid} /> : <Text style={styles.customButtonText}>Add</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.txnRow}>
            <View>
              <Text style={styles.txnType}>{formatTxnType(item.type)}</Text>
              <Text style={styles.txnDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            <Text style={[styles.txnAmount, item.amount < 0 ? styles.txnNegative : styles.txnPositive]}>
              {item.amount > 0 ? '+' : ''}₹{item.amount.toFixed(2)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function formatTxnType(type: string): string {
  switch (type) {
    case 'recharge':
      return 'Wallet Recharge';
    case 'chat_deduction':
      return 'Chat Consultation';
    case 'refund':
      return 'Refund';
    case 'astrologer_earning':
      return 'Earning';
    default:
      return type;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid, padding: 20 },
  balanceCard: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  balanceValue: { color: colors.accentGold, fontSize: 34, fontWeight: '700' },
  sectionTitle: { color: colors.textPrimary, fontSize: 14.5, fontWeight: '600', marginBottom: 12, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickButton: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quickButtonText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13.5 },
  customRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  customInput: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 14.5,
  },
  customButton: { backgroundColor: colors.accentGold, borderRadius: 12, paddingHorizontal: 22, justifyContent: 'center' },
  customButtonText: { color: colors.bgVoid, fontWeight: '700', fontSize: 14 },
  empty: { color: colors.textTertiary, textAlign: 'center', marginTop: 20, fontSize: 13.5 },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  txnType: { color: colors.textPrimary, fontSize: 14 },
  txnDate: { color: colors.textTertiary, fontSize: 11.5, marginTop: 2 },
  txnAmount: { fontSize: 14.5, fontWeight: '600' },
  txnPositive: { color: colors.online },
  txnNegative: { color: colors.accentRed },
});
