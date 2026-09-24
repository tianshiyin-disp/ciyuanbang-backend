import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key'

export interface JWTPayload {
  id: string
  address: string
  email?: string
  tier?: string
}

export const signJWT = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyJWT = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}