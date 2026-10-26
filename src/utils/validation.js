import ApiError from './ApiError.js'

// Lightweight request validation helpers (no extra library needed).

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/
export const PINCODE_REGEX = /^[1-9]\d{5}$/
export const PASSWORD_MIN_LENGTH = 8

export function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeEmail(value) {
  return cleanString(value).toLowerCase()
}

// Accepts "9876543210", "+91 98765 43210", "098765-43210" -> "9876543210"
export function normalizePhone(value) {
  const digits = cleanString(value).replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (password.length > 72) return 'Password must be at most 72 characters'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number'
  }
  return null
}

// Throws a 400 ApiError listing every invalid field.
export function assertValid(errors) {
  const entries = Object.entries(errors).filter(([, message]) => Boolean(message))
  if (entries.length) {
    throw ApiError.badRequest('Please correct the highlighted fields', Object.fromEntries(entries))
  }
}