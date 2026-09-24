import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import tokenRoutes from './routes/token'
import pointsRoutes from './routes/points'
import subscriptionRoutes from './routes/subscription'
import rankingsRoutes from './routes/rankings'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/token', tokenRoutes)
app.use('/api/points', pointsRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/rankings', rankingsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(errorHandler)

app.listen(port, () => {
  console.log('⚡ 词元帮后端服务已启动')
  console.log(`📍 http://localhost:${port}`)
  console.log(`✅ 环境: ${process.env.NODE_ENV || 'development'}`)
})