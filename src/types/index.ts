export type UserRole = 'customer' | 'astrologer';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AstrologerProfile {
  id: string;
  bio: string | null;
  specializations: string[];
  languages: string[];
  experience_years: number;
  per_minute_rate: number;
  is_online: boolean;
  is_approved: boolean;
  rating_avg: number;
  rating_count: number;
}

export interface AstrologerWithProfile extends AstrologerProfile {
  profile: Profile;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
}

export type WalletTxnType = 'recharge' | 'chat_deduction' | 'refund' | 'astrologer_earning';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTxnType;
  amount: number;
  balance_after: number;
  chat_session_id: string | null;
  notes: string | null;
  created_at: string;
}

export type ChatSessionStatus = 'requested' | 'active' | 'ended' | 'rejected' | 'cancelled';

export interface ChatSession {
  id: string;
  customer_id: string;
  astrologer_id: string;
  status: ChatSessionStatus;
  per_minute_rate: number;
  started_at: string | null;
  ended_at: string | null;
  total_minutes: number;
  total_charged: number;
  ended_reason: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Review {
  id: string;
  session_id: string;
  customer_id: string;
  astrologer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
