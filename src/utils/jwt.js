import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function signAccessToken(user, { remember = false } = {}) {
  const expiresIn = remember ? env.jwtRememberExpiresIn : env.jwtExpiresIn
  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn })
  const { exp } = jwt.decode(token)
  return { token, expiresAt: new Date(exp * 1000).toISOString() }
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret)
}