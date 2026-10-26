// User roles - must stay in sync with the Role enum in prisma/schema.prisma
export const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  PROVIDER: 'PROVIDER',
  ADMIN: 'ADMIN',
  REPRESENTATIVE: 'REPRESENTATIVE',
})

// Which roles may sign in through each login portal.
export const LOGIN_PORTALS = Object.freeze({
  customer: [ROLES.CUSTOMER],
  provider: [ROLES.PROVIDER],
  staff: [ROLES.ADMIN, ROLES.REPRESENTATIVE],
})