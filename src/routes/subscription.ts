import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { supabase } from '../utils/supabase'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()

// 套餐配置
const PLANS = {
  monthly: {
    id: 'monthly',
    name: '月付',
    price: 19.9,
    icon: '📅',
    description: '灵活试用，随时可续',
    features: ['完整榜单访问', '智能路由推荐', '全部历史记录', '基础报告导出'],
  },
  yearly: {
    id: 'yearly',
    name: '年付',
    price: 199.0,
    icon: '⭐',
    description: '最受欢迎，性价比高',
    features: ['月付全部功能', '成本预警', '团队配额管理', '专属客服'],
  },
  lifetime: {
    id: 'lifetime',
    name: '终身买断',
    price: 399.0,
    icon: '💎',
    description: '终身权益，超值选择',
    features: ['年付全部功能', '永久有效', '优先更新', '专属徽章'],
  },
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = './uploads'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, unique + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

// GET /api/subscription/plans
router.get('/plans', (_req, res) => {
  res.json({ success: true, data: Object.values(PLANS) })
})

// GET /api/subscription/status
router.get('/status', authenticate, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', req.user.id)
      .single()

    if (error) {
      res.json({ success: true, data: { is_premium: false, tier: 'free', expires_at: null } })
      return
    }

    const isPremium = data.subscription_tier === 'premium' && 
      data.subscription_expires_at && 
      new Date(data.subscription_expires_at) > new Date()

    res.json({
      success: true,
      data: {
        is_premium: isPremium || false,
        tier: data.subscription_tier || 'free',
        expires_at: data.subscription_expires_at || null,
      },
    })
  } catch {
    res.json({ success: true, data: { is_premium: false, tier: 'free', expires_at: null } })
  }
})

// POST /api/subscription/upload
router.post('/upload', authenticate, upload.single('proof'), async (req: any, res) => {
  try {
    const { orderId, plan, amount, note } = req.body
    const userId = req.user.id

    if (!orderId || !plan || !amount) {
      res.status(400).json({ error: '缺少必要参数' })
      return
    }

    const proofPath = req.file?.path || ''

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: plan,
        amount: parseFloat(amount),
        order_id: orderId,
        status: 'pending',
        payment_proof: proofPath,
        note: note || '',
      })
      .select()

    if (error) {
      console.error('[subscription] 保存失败:', error)
      res.status(500).json({ error: '保存订单失败' })
      return
    }

    console.log(`[subscription] ✅ 订单已保存: ${orderId}`)
    res.json({ success: true, data: data[0] })

  } catch (error) {
    console.error('[subscription] 上传失败:', error)
    res.status(500).json({ error: '上传失败，请重试' })
  }
})

// GET /api/subscription/orders - 管理员查看所有订单
router.get('/orders', authenticate, async (_req: any, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, profiles(nickname, public_address)')
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ error: '查询失败' })
    return
  }

  res.json({ success: true, data })
})

export default router