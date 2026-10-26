import prisma from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { assertValid, cleanString } from '../utils/validation.js'

const PAGE_SIZE = 20

const REVIEW_INCLUDE = {
  customer: { select: { fullName: true } },
  request: { select: { id: true, reference: true, title: true } },
  provider: { select: { id: true, user: { select: { fullName: true } } } },
}

// Shows "Asha K." instead of a full name so public reviews stay private.
function displayName(fullName) {
  const parts = cleanString(fullName).split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Customer'
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

// Public reviews carry no request ids. The two people involved also get the job reference.
function serializeReview(review, { parties = false } = {}) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    reviewer: displayName(review.customer.fullName),
    service: review.request.title,
    ...(parties && {
      request: { id: review.request.id, reference: review.request.reference },
      provider: { id: review.provider.id, fullName: review.provider.user.fullName },
    }),
  }
}

async function summaryFor(providerId) {
  const rows = await prisma.review.groupBy({ by: ['rating'], where: { providerId }, _count: { _all: true } })
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  rows.forEach((r) => (distribution[r.rating] = r._count._all))
  const count = Object.values(distribution).reduce((sum, n) => sum + n, 0)
  const total = Object.entries(distribution).reduce((sum, [stars, n]) => sum + Number(stars) * n, 0)
  return { average: count ? Math.round((total / count) * 10) / 10 : null, count, distribution }
}

async function pageOfReviews(providerId, page, parties) {
  const number = Math.max(1, Number.parseInt(page, 10) || 1)
  const [summary, rows] = await Promise.all([
    summaryFor(providerId),
    prisma.review.findMany({
      where: { providerId },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (number - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
  ])
  return {
    summary,
    items: rows.slice(0, PAGE_SIZE).map((r) => serializeReview(r, { parties })),
    page: number,
    hasMore: rows.length > PAGE_SIZE,
  }
}

// --- Customer --------------------------------------------

export async function createReview(customerId, input = {}) {
  const requestId = cleanString(input.requestId)
  const rating = Number(input.rating)
  const comment = cleanString(input.comment)
  assertValid({
    rating: !Number.isInteger(rating) || rating < 1 || rating > 5 ? 'Choose a rating from 1 to 5 stars' : null,
    comment: comment.length > 1000 ? 'Keep the review under 1000 characters' : null,
  })

  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, customerId: true, providerId: true, status: true },
  })
  if (!request || request.customerId !== customerId) throw ApiError.notFound('Service request not found')
  if (request.status !== 'COMPLETED') throw ApiError.conflict('You can review a job once it is completed')

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({ where: { requestId: request.id }, select: { id: true } })
      if (existing) throw ApiError.conflict('You have already reviewed this job')
      const review = await tx.review.create({
        data: { requestId: request.id, customerId, providerId: request.providerId, rating, comment: comment || null },
        include: REVIEW_INCLUDE,
      })
      // Keep the average and count on the provider so search cards need no extra query.
      const stats = await tx.review.aggregate({ where: { providerId: request.providerId }, _avg: { rating: true }, _count: { _all: true } })
      await tx.providerProfile.update({
        where: { id: request.providerId },
        data: { ratingAverage: Math.round(stats._avg.rating * 10) / 10, ratingCount: stats._count._all },
      })
      return review
    })
    return serializeReview(created, { parties: true })
  } catch (error) {
    if (error?.code === 'P2002') throw ApiError.conflict('You have already reviewed this job')
    throw error
  }
}

// Reviews the customer has written, plus completed jobs still waiting for one.
export async function listCustomerReviews(customerId) {
  const [reviews, pending] = await Promise.all([
    prisma.review.findMany({ where: { customerId }, include: REVIEW_INCLUDE, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.serviceRequest.findMany({
      where: { customerId, status: 'COMPLETED', review: { is: null } },
      select: {
        id: true,
        reference: true,
        title: true,
        completedAt: true,
        finalAmount: true,
        provider: { select: { id: true, user: { select: { fullName: true } } } },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    }),
  ])
  return {
    reviews: reviews.map((r) => serializeReview(r, { parties: true })),
    pending: pending.map((p) => ({
      requestId: p.id,
      reference: p.reference,
      service: p.title,
      completedAt: p.completedAt,
      finalAmount: p.finalAmount,
      provider: { id: p.provider.id, fullName: p.provider.user.fullName },
    })),
  }
}

// --- Provider and public ---------------------------------

export async function listOwnProviderReviews(userId, { page } = {}) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) throw ApiError.notFound('Provider profile not found')
  return pageOfReviews(profile.id, page, true)
}

export async function listPublicReviews(providerId, { page } = {}) {
  const profile = await prisma.providerProfile.findFirst({
    where: { id: cleanString(providerId), verificationStatus: 'APPROVED', user: { status: 'ACTIVE' } },
    select: { id: true },
  })
  if (!profile) throw ApiError.notFound('Electrician not found')
  return pageOfReviews(profile.id, page, false)
}