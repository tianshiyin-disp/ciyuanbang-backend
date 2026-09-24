import { Router } from 'express'
import { authenticate } from '../middleware/auth'

const router = Router()

// 模拟积分数据
const pointsStore: Record<string, any> = {}

// GET /api/points/balance - 获取积分余额
router.get('/balance', authenticate, (req: any, res) => {
  const userId = req.user.id

  if (!pointsStore[userId]) {
    pointsStore[userId] = {
      cyb_power_balance: 0,
      cyb_trust_score: 100,
      last_checkin_date: null,
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const hasCheckedIn = pointsStore[userId].last_checkin_date === today

  res.json({
    success: true,
    data: {
      ...pointsStore[userId],
      has_checked_in: hasCheckedIn,
    },
  })
})

// POST /api/points/checkin - 签到
router.post('/checkin', authenticate, (req: any, res) => {
  const userId = req.user.id
  const today = new Date().toISOString().split('T')[0]

  if (!pointsStore[userId]) {
    pointsStore[userId] = {
      cyb_power_balance: 0,
      cyb_trust_score: 100,
      last_checkin_date: null,
    }
  }

  if (pointsStore[userId].last_checkin_date === today) {
    res.status(400).json({ error: '今日已签到' })
    return
  }

  pointsStore[userId].cyb_power_balance += 5
  pointsStore[userId].last_checkin_date = today

  res.json({
    success: true,
    message: '签到成功！获得 5 词元力',
    data: {
      cyb_power_balance: pointsStore[userId].cyb_power_balance,
      cyb_trust_score: pointsStore[userId].cyb_trust_score,
    },
  })
})

// GET /api/points/history - 积分流水
router.get('/history', authenticate, (_req: any, res) => {
  res.json({
    success: true,
    data: {
      transactions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    },
  })
})

export default router