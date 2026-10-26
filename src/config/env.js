import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const nodeEnv = process.env.NODE_ENV || 'development'

const required = ['DATABASE_URL', 'JWT_SECRET']
const missing = required.filter((key) => !process.env[key])
if (missing.length) {
  const message = `[config] Missing environment variables: ${missing.join(', ')}`
  if (nodeEnv === 'production') throw new Error(message)
  console.warn(message)
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('[config] JWT_SECRET should be at least 32 characters long')
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || '30d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  // Local file storage for verification documents (moves to cloud storage in a later phase)
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 5,
})