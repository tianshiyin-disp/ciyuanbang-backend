import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { signJWT } from '../utils/jwt'
import { supabase } from '../utils/supabase'

const router = Router()

// 内存存储 nonce（生产环境用 Redis）
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>()

// POST /api/auth/nonce
router.post('/nonce', (req, res) => {
  const { publicAddress } = req.body

  if (!publicAddress) {
    res.status(400).json({ error: '缺少 publicAddress 参数' })
    return
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(publicAddress)) {
    res.status(400).json({ error: '无效的以太坊地址格式' })
    return
  }

  const address = publicAddress.toLowerCase()
  const nonce = `请签名此消息以登录词元帮: ${Date.now()}.${Math.random().toString(36).slice(2, 10)}`

  nonceStore.set(address, {
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })

  res.json({ nonce, message: '请用你的钱包签名此消息以登录词元帮' })
})

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  const { publicAddress, signature, nonce } = req.body

  if (!publicAddress || !signature || !nonce) {
    res.status(400).json({ error: '缺少必要参数' })
    return
  }

  const address = publicAddress.toLowerCase()
  const stored = nonceStore.get(address)

  if (!stored || stored.nonce !== nonce || Date.now() > stored.expiresAt) {
    res.status(401).json({ error: '挑战码无效或已过期' })
    return
  }

  nonceStore.delete(address)

  // 🔑 真实写入 Supabase
  try {
    // 1. 查询用户是否存在
    let { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('public_address', address)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[auth] 查询用户失败:', error)
      res.status(500).json({ error: '数据库查询失败' })
      return
    }

    // 2. 如果用户不存在，创建新用户
    if (!user) {
      const nickname = `词元客-${address.slice(2, 8)}`
      const { data: newUser, error: insertError } = await supabase
        .from('profiles')
        .insert({
          public_address: address,
          nickname: nickname,
          subscription_tier: 'free',
        })
        .select()
        .single()

      if (insertError) {
        console.error('[auth] 创建用户失败:', insertError)
        res.status(500).json({ error: '创建用户失败' })
        return
      }
      user = newUser
      console.log('[auth] ✅ 新用户已写入 Supabase:', address)
    } else {
      console.log('[auth] ✅ 用户已存在:', address)
    }

    // 3. 签发 JWT
    const token = signJWT({
      id: user.id,
      address: user.public_address,
      email: user.email,
      tier: user.subscription_tier,
    })

    res.json({
      success: true,
      user: {
        id: user.id,
        address: user.public_address,
        nickname: user.nickname,
        email: user.email,
        tier: user.subscription_tier,
      },
      token,
    })
  } catch (error) {
    console.error('[auth] 验证失败:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: any, res) => {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error || !user) {
    res.status(401).json({ error: '用户不存在' })
    return
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      address: user.public_address,
      nickname: user.nickname,
      email: user.email,
      tier: user.subscription_tier,
    },
  })
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: '已登出' })
})

export default router