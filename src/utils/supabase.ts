import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase 配置缺失，请设置环境变量')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey)