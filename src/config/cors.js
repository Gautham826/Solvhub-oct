import { env } from './env.js'

// Comma-separated list allows adding more origins (e.g. a deployed client) later.
const allowedOrigins = env.clientUrl.split(',').map((origin) => origin.trim())

export const corsOptions = {
  origin(origin, callback) {
    // Allow tools without an Origin header (curl, Postman).
    // Unknown browser origins get no CORS headers, so the browser blocks the response.
    callback(null, !origin || allowedOrigins.includes(origin))
  },
  credentials: true,
}