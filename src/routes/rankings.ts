import { Router } from 'express'

const router = Router()

// 模拟榜单数据
const RANKINGS_DATA = [
  { rank: 1, model: 'DeepSeek-V3', tokens: 920, time: 900, accuracy: 88, price: '0.0028', trend: 'up' },
  { rank: 2, model: 'Claude-3-Sonnet', tokens: 980, time: 1200, accuracy: 87, price: '0.0030', trend: 'flat' },
  { rank: 3, model: 'GPT-4-Turbo', tokens: 1100, time: 1800, accuracy: 90, price: '0.0100', trend: 'down' },
  { rank: 4, model: 'Claude-3-Opus', tokens: 1050, time: 2500, accuracy: 94, price: '0.0150', trend: 'up' },
  { rank: 5, model: '文心一言 4.0', tokens: 1350, time: 800, accuracy: 85, price: '0.0050', trend: 'flat' },
  { rank: 6, model: '通义千问 2.5', tokens: 1180, time: 600, accuracy: 82, price: '0.0040', trend: 'down' },
  { rank: 7, model: '智谱 GLM-4', tokens: 1150, time: 1100, accuracy: 86, price: '0.0060', trend: 'flat' },
  { rank: 8, model: 'MiniMax abab6.5', tokens: 1300, time: 700, accuracy: 80, price: '0.0045', trend: 'up' },
  { rank: 9, model: '讯飞星火 4.0', tokens: 1420, time: 500, accuracy: 78, price: '0.0035', trend: 'down' },
]

// GET /api/rankings - 获取榜单
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      rankings: RANKINGS_DATA,
      canViewFull: true,
      total: RANKINGS_DATA.length,
      updatedAt: new Date().toISOString(),
    },
  })
})

export default router