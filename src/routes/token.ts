import { Router } from 'express'
import { authenticate } from '../middleware/auth'

const router = Router()

// 模型配置
const MODEL_RATIO: Record<string, number> = {
  'DeepSeek-V3': 1.6,
  'Claude-3-Sonnet': 1.8,
  'Claude-3-Opus': 2.0,
  'GPT-4-Turbo': 2.2,
  'GPT-4': 2.5,
  '文心一言 4.0': 3.0,
  '通义千问 2.5': 2.8,
  '讯飞星火 4.0': 3.2,
  'MiniMax abab6.5': 2.9,
  '智谱 GLM-4': 2.6,
}

const MODEL_PRICE: Record<string, number> = {
  'DeepSeek-V3': 0.0028,
  'Claude-3-Sonnet': 0.0030,
  'Claude-3-Opus': 0.0150,
  'GPT-4-Turbo': 0.0100,
  'GPT-4': 0.0300,
  '文心一言 4.0': 0.0050,
  '通义千问 2.5': 0.0040,
  '讯飞星火 4.0': 0.0035,
  'MiniMax abab6.5': 0.0045,
  '智谱 GLM-4': 0.0060,
}

const EXCHANGE_RATE = 7.2

// 模拟计算历史
const histories: any[] = []

// POST /api/token/calculate - 计算词元
router.post('/calculate', (req, res) => {
  const { text, modelKey } = req.body

  if (!text || text.trim().length < 10) {
    res.status(400).json({ error: '请输入至少 10 个字符的文本' })
    return
  }

  if (!modelKey) {
    res.status(400).json({ error: '请选择模型' })
    return
  }

  const ratio = MODEL_RATIO[modelKey] || 2.0
  const price = MODEL_PRICE[modelKey] || 0.01

  const charCount = text.length
  const estimatedTokens = Math.ceil(charCount * ratio)
  const costUSD = (estimatedTokens / 1000) * price
  const costCNY = costUSD * EXCHANGE_RATE

  const result = {
    modelKey,
    charCount,
    estimatedTokens,
    costUSD,
    costCNY,
    costDisplay: `¥${costCNY.toFixed(4)}`,
  }

  res.json({ success: true, data: result })
})

// GET /api/token/history - 获取计算历史
router.get('/history', authenticate, (req: any, res) => {
  const userHistories = histories.filter(h => h.userId === req.user.id)
  res.json({
    success: true,
    data: userHistories.slice(0, 20),
  })
})

export default router