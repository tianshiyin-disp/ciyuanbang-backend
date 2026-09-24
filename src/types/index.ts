export interface User {
  id: string
  public_address: string
  nickname: string
  email: string | null
  subscription_tier: 'free' | 'premium'
  created_at: string
}

export interface TokenCalculation {
  id: string
  user_id: string
  model_name: string
  input_text: string
  token_consumed: number
  cost_usd: number
  cost_cny: number
  created_at: string
}

export interface Points {
  user_id: string
  cyb_power_balance: number
  cyb_trust_score: number
  last_checkin_date: string | null
}

export interface Subscription {
  id: string
  user_id: string
  plan: string
  amount: number
  order_id: string
  status: 'pending' | 'paid' | 'active' | 'expired'
  activated_at: string | null
  expires_at: string | null
  created_at: string
}