import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { ChatMessage, ChatSession } from '../types';

interface UseChatSessionResult {
  session: ChatSession | null;
  messages: ChatMessage[];
  sending: boolean;
  sendMessage: (content: string) => Promise<void>;
  endSession: (reason: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useChatSession(sessionId: string, senderId: string): UseChatSessionResult {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data: sessionData } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (sessionData) setSession(sessionData as ChatSession);

    const { data: messageData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (messageData) setMessages(messageData as ChatMessage[]);
  }, [sessionId]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          setSession(payload.new as ChatSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchAll]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: senderId,
        content: content.trim(),
      });
    } finally {
      setSending(false);
    }
  };

  const endSession = async (reason: string) => {
    await supabase.rpc('end_chat_session', { p_session_id: sessionId, p_reason: reason });
  };

  return { session, messages, sending, sendMessage, endSession, refresh: fetchAll };
}
