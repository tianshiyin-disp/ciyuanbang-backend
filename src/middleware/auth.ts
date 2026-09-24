import { Request, Response, NextFunction } from 'express'
import { verifyJWT, extractTokenFromHeader } from '../utils/jwt'

export interface AuthRequest extends Request {
  user?: {
    id: string
    address: string
    email?: string
    tier?: string
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // 先从 Authorization header 取 token
  let token = extractTokenFromHeader(req.headers.authorization)
  
  // 如果没有，从 cookie 取
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/token=([^;]+)/)
    if (match) token = match[1]
  }

  if (!token) {
    res.status(401).json({ error: '未登录，请先登录' })
    return
  }

  const payload = verifyJWT(token)
  if (!payload) {
    res.status(401).json({ error: '登录已过期，请重新登录' })
    return
  }

  req.user = payload
  next()
}