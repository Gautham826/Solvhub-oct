import prisma from '../config/prisma.js'
import { ROLES, LOGIN_PORTALS } from '../config/roles.js'
import ApiError from '../utils/ApiError.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { signAccessToken } from '../utils/jwt.js'
import { serializeUser } from '../utils/serializers.js'
import {
  EMAIL_REGEX,
  INDIAN_MOBILE_REGEX,
  PINCODE_REGEX,
  assertValid,
  cleanString,
  normalizeEmail,
  normalizePhone,
  validatePassword,
} from '../utils/validation.js'

const USER_INCLUDE = { addresses: true, providerProfile: true }

// Used when the email is unknown so response time doesn't reveal whether an account exists.
let dummyHashPromise
const getDummyHash = () => (dummyHashPromise ??= hashPassword('solvhub-timing-equaliser'))

function validateAccountFields(input) {
  const account = {
    fullName: cleanString(input.fullName),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    password: input.password,
  }

  assertValid({
    fullName:
      account.fullName.length < 2 || account.fullName.length > 80
        ? 'Enter your full name (2-80 characters)'
        : null,
    email: !EMAIL_REGEX.test(account.email) ? 'Enter a valid email address' : null,
    phone: !INDIAN_MOBILE_REGEX.test(account.phone) ? 'Enter a valid 10-digit Indian mobile number' : null,
    password: validatePassword(account.password),
    confirmPassword:
      input.confirmPassword !== undefined && input.confirmPassword !== input.password
        ? 'Passwords do not match'
        : null,
    acceptTerms: input.acceptTerms !== true ? 'You must accept the terms to continue' : null,
  })

  return account
}

function validateAddress(input = {}) {
  const address = {
    line1: cleanString(input.line1),
    landmark: cleanString(input.landmark) || null,
    city: cleanString(input.city),
    state: cleanString(input.state),
    pincode: cleanString(input.pincode),
  }

  assertValid({
    'address.line1': address.line1.length < 5 ? 'Enter your street address' : null,
    'address.city': address.city.length < 2 ? 'Enter your city' : null,
    'address.state': address.state.length < 2 ? 'Select your state' : null,
    'address.pincode': !PINCODE_REGEX.test(address.pincode) ? 'Enter a valid 6-digit PIN code' : null,
  })

  return address
}

async function assertEmailAvailable(email) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    throw ApiError.conflict('An account with this email already exists', {
      email: 'This email is already registered. Try logging in instead.',
    })
  }
}

function authResponse(user, remember = false) {
  return { user: serializeUser(user), ...signAccessToken(user, { remember }) }
}

export async function registerCustomer(input) {
  const account = validateAccountFields(input)
  const address = validateAddress(input.address)
  await assertEmailAvailable(account.email)

  const user = await prisma.user.create({
    data: {
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      passwordHash: await hashPassword(account.password),
      role: ROLES.CUSTOMER,
      addresses: { create: { ...address, label: 'Home', isDefault: true } },
    },
    include: USER_INCLUDE,
  })

  return authResponse(user)
}

export async function registerProvider(input) {
  const account = validateAccountFields(input)
  await assertEmailAvailable(account.email)

  const user = await prisma.user.create({
    data: {
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      passwordHash: await hashPassword(account.password),
      role: ROLES.PROVIDER,
      providerProfile: { create: {} }, // starts as INCOMPLETE until Phase 2 onboarding is submitted
    },
    include: USER_INCLUDE,
  })

  return authResponse(user)
}

export async function login({ email, password, portal, remember }) {
  const normalizedEmail = normalizeEmail(email)
  assertValid({
    email: !EMAIL_REGEX.test(normalizedEmail) ? 'Enter a valid email address' : null,
    password: typeof password !== 'string' || !password ? 'Enter your password' : null,
    portal: portal && !LOGIN_PORTALS[portal] ? 'Unknown login portal' : null,
  })

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: USER_INCLUDE })
  const passwordOk = await verifyPassword(password, user?.passwordHash || (await getDummyHash()))
  if (!user || !passwordOk) throw ApiError.unauthorized('Incorrect email or password')

  if (portal && !LOGIN_PORTALS[portal].includes(user.role)) {
    const portalFor = { CUSTOMER: 'Customer', PROVIDER: 'Service Provider', ADMIN: 'Staff', REPRESENTATIVE: 'Staff' }
    throw ApiError.forbidden(`This account is registered as a ${portalFor[user.role]} account. Please use the ${portalFor[user.role]} login.`)
  }

  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden('Your account has been suspended. Please contact SOLVHub support.')
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    include: USER_INCLUDE,
  })

  return authResponse(updated, remember === true)
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE })
  if (!user) throw ApiError.notFound('User not found')
  return serializeUser(user)
}