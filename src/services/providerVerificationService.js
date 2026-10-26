import prisma from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { assertValid, cleanString } from '../utils/validation.js'
import { PROVIDER_PROFILE_INCLUDE, serializeProviderProfile } from '../utils/providerSerializer.js'

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'INCOMPLETE']

// Application queue for the admin Provider Verification workspace.
export async function listApplications({ status = 'PENDING', search = '' } = {}) {
  const filterStatus = STATUSES.includes(status) ? status : 'PENDING'
  const term = cleanString(search).slice(0, 80)

  const where = {
    verificationStatus: filterStatus,
    ...(term && {
      user: {
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
          { addresses: { some: { OR: [{ city: { contains: term, mode: 'insensitive' } }, { pincode: { startsWith: term } }] } } },
        ],
      },
    }),
  }

  const [counts, profiles] = await Promise.all([
    prisma.providerProfile.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
    prisma.providerProfile.findMany({
      where,
      // Oldest submissions first so nobody waits too long; other lists show latest activity first.
      orderBy: filterStatus === 'PENDING' ? { submittedAt: 'asc' } : { updatedAt: 'desc' },
      take: 50,
      include: {
        user: { include: { addresses: true } },
        services: { select: { name: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { documents: true } },
      },
    }),
  ])

  const totals = Object.fromEntries(STATUSES.map((s) => [s, 0]))
  counts.forEach((row) => (totals[row.verificationStatus] = row._count._all))

  return {
    status: filterStatus,
    totals,
    items: profiles.map((p) => {
      const address = p.user.addresses.find((a) => a.isDefault) || p.user.addresses[0]
      return {
        id: p.id,
        fullName: p.user.fullName,
        email: p.user.email,
        providerType: p.providerType,
        experienceYears: p.experienceYears,
        qualification: p.qualification,
        location: address ? `${address.city}, ${address.state}` : null,
        services: p.services.map((s) => s.name),
        documentsCount: p._count.documents,
        verificationStatus: p.verificationStatus,
        submittedAt: p.submittedAt,
        reviewedAt: p.reviewedAt,
        createdAt: p.createdAt,
      }
    }),
  }
}

async function loadProfile(profileId) {
  const profile = await prisma.providerProfile.findUnique({ where: { id: profileId }, include: PROVIDER_PROFILE_INCLUDE })
  if (!profile) throw ApiError.notFound('Provider application not found')
  return profile
}

export async function getApplication(profileId) {
  return serializeProviderProfile(await loadProfile(profileId), { forAdmin: true })
}

async function decide(profileId, adminId, data) {
  // Only move PENDING -> APPROVED/REJECTED (updateMany avoids a race between two admins).
  const { count } = await prisma.providerProfile.updateMany({
    where: { id: profileId, verificationStatus: 'PENDING' },
    data: { ...data, reviewedAt: new Date(), reviewedById: adminId },
  })
  if (!count) {
    await loadProfile(profileId) // 404 if it does not exist
    throw ApiError.conflict('This application is not awaiting review (it may already have been decided).')
  }
  return getApplication(profileId)
}

export async function approveApplication(profileId, adminId, input = {}) {
  const notes = cleanString(input.notes)
  assertValid({ notes: notes.length > 1000 ? 'Keep review notes under 1000 characters' : null })
  return decide(profileId, adminId, { verificationStatus: 'APPROVED', rejectionReason: null, reviewNotes: notes || null })
}

export async function rejectApplication(profileId, adminId, input = {}) {
  const reason = cleanString(input.reason)
  const notes = cleanString(input.notes)
  assertValid({
    reason:
      reason.length < 10
        ? 'Explain the reason (at least 10 characters) so the provider can fix it'
        : reason.length > 500
          ? 'Keep the reason under 500 characters'
          : null,
    notes: notes.length > 1000 ? 'Keep review notes under 1000 characters' : null,
  })
  return decide(profileId, adminId, { verificationStatus: 'REJECTED', rejectionReason: reason, reviewNotes: notes || null })
}