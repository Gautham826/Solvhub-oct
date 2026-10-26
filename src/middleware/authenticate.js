import prisma from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { verifyAccessToken } from '../utils/jwt.js'

// Verifies the Bearer token and attaches the current user (fresh from the DB) to req.user.
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized()

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch (error) {
    throw ApiError.unauthorized(
      error.name === 'TokenExpiredError' ? 'Your session has expired. Please log in again.' : 'Invalid session token',
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, status: true, email: true, fullName: true },
  })
  if (!user) throw ApiError.unauthorized('Account no longer exists')
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Your account has been suspended')

  req.user = user
  next()
}