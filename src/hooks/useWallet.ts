import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Wallet, WalletTransaction } from '../types';

interface UseWalletResult {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useWallet(): UseWalletResult {
  const { session } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!session?.user) return;

    const { data: walletData } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (walletData) {
      setWallet(walletData as Wallet);

      const { data: txnData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions((txnData as WalletTransaction[]) ?? []);
    }
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Realtime: reflect balance changes immediately (e.g. during an active chat).
  useEffect(() => {
    if (!wallet?.id) return;

    const channel = supabase
      .channel(`wallet-${wallet.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `id=eq.${wallet.id}` },
        (payload) => {
          setWallet(payload.new as Wallet);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallet?.id]);

  return { wallet, transactions, loading, refresh: fetchWallet };
}
