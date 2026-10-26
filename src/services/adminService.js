import prisma from '../config/prisma.js'
import { ROLES } from '../config/roles.js'
import { serializeUser } from '../utils/serializers.js'

// Real-time platform counts for the admin overview.
export async function getOverview() {
  const [roleCounts, verificationCounts, recentUsers] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.providerProfile.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { providerProfile: true },
    }),
  ])

  const users = Object.fromEntries(Object.values(ROLES).map((role) => [role, 0]))
  roleCounts.forEach((row) => (users[row.role] = row._count._all))

  const providerVerification = { INCOMPLETE: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 }
  verificationCounts.forEach((row) => (providerVerification[row.verificationStatus] = row._count._all))

  return { users, providerVerification, recentUsers: recentUsers.map(serializeUser) }
}