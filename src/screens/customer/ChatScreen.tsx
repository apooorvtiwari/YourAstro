import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useChatSession } from '../../hooks/useChatSession';
import { useWallet } from '../../hooks/useWallet';
import { colors } from '../../theme';
import { showAlert } from '../../utils/showAlert';

export function ChatScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const { session: authSession, profile } = useAuth();
  const { session, messages, sendMessage, endSession } = useChatSession(sessionId, authSession!.user.id);
  const { wallet } = useWallet();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const isCustomer = profile?.role === 'customer';

  useEffect(() => {
    if (session?.status === 'ended') {
      const reasonMessage =
        session.ended_reason === 'low_balance'
          ? 'Chat ended — wallet balance ran out.'
          : 'Chat session ended.';
      showAlert('Session ended', reasonMessage, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  }, [session?.status, session?.ended_reason]);

  const handleSend = async () => {
    if (!input.trim() || session?.status !== 'active') return;
    const text = input;
    setInput('');
    await sendMessage(text);
    listRef.current?.scrollToEnd({ animated: true });
  };

  const handleEnd = () => {
    showAlert('End chat?', 'This will end the consultation for both participants.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Chat',
        style: 'destructive',
        onPress: () => endSession(isCustomer ? 'customer_ended' : 'astrologer_ended'),
      },
    ]);
  };

  if (!session) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.liveDot, session.status === 'active' && styles.liveDotActive]} />
          <Text style={styles.statusText}>
            {session.status === 'active' ? `Live · ${session.total_minutes} min` : session.status}
          </Text>
        </View>
        {isCustomer && wallet && (
          <Text style={styles.balanceText}>₹{wallet.balance.toFixed(2)} left</Text>
        )}
        <TouchableOpacity onPress={handleEnd}>
          <Text style={styles.endText}>End</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMine = item.sender_id === authSession?.user.id;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
            </View>
          );
        }}
      />

      {session.status === 'active' ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.endedBanner}>
          <Text style={styles.endedText}>This session has ended.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textTertiary },
  liveDotActive: { backgroundColor: colors.online },
  statusText: { color: colors.textSecondary, fontSize: 12.5, textTransform: 'capitalize' },
  balanceText: { color: colors.accentGold, fontSize: 12.5, fontWeight: '600' },
  endText: { color: colors.accentRed, fontSize: 13, fontWeight: '600' },
  messageList: { padding: 16, gap: 10 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleMine: { backgroundColor: colors.accentGold, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgPanel, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.textPrimary, fontSize: 14.5, lineHeight: 20 },
  bubbleTextMine: { color: colors.bgVoid },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14.5,
    maxHeight: 100,
  },
  sendButton: { backgroundColor: colors.accentGold, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18 },
  sendButtonText: { color: colors.bgVoid, fontWeight: '700', fontSize: 13.5 },
  endedBanner: { padding: 16, alignItems: 'center' },
  endedText: { color: colors.textTertiary, fontSize: 13 },
});
