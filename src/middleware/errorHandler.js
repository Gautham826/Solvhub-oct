import { env } from '../config/env.js'

// Translates known Prisma errors into HTTP responses.
function fromPrismaError(err) {
  if (err.code === 'P2002') return { statusCode: 409, message: 'A record with these details already exists' }
  if (err.code === 'P2025') return { statusCode: 404, message: 'Record not found' }
  return null
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body must be valid JSON' })
  }

  const prismaError = fromPrismaError(err)
  const statusCode = prismaError?.statusCode || err.statusCode || 500
  if (statusCode >= 500) console.error(err)

  res.status(statusCode).json({
    success: false,
    message:
      prismaError?.message ||
      (statusCode >= 500 && env.isProduction ? 'Internal server error' : err.message),
    ...(err.errors && { errors: err.errors }),
  })
}