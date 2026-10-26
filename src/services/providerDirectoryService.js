import prisma from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { cleanString } from '../utils/validation.js'
import { PROVIDER_TYPES } from '../constants/providerProfile.js'
import { baseAddressOf, serializePublicProvider, todayCodeIST } from '../utils/publicProviderSerializer.js'
import { assertFileExists, resolvePath } from './fileStorage.js'

const PAGE_SIZE = 12
const SORTS = ['relevance', 'experience', 'newest']

const LISTING_INCLUDE = {
  user: { select: { fullName: true, createdAt: true, status: true, addresses: true } },
  services: { select: { slug: true, name: true, icon: true, description: true }, orderBy: { sortOrder: 'asc' } },
  documents: { select: { type: true } },
}

// Only approved providers whose account is active are ever visible to the public.
const PUBLIC_WHERE = { verificationStatus: 'APPROVED', user: { status: 'ACTIVE' } }

// Location matching until map coordinates are added: PIN code / city / state.
// Returns { score, label } or null when the provider is not in the searched area.
function matchLocation(address, location) {
  if (!location) return { score: 0, label: null }
  if (!address) return null
  if (/^[1-9]\d{5}$/.test(location)) {
    if (address.pincode === location) return { score: 3, label: `Same PIN code (${location})` }
    if (address.pincode.slice(0, 3) === location.slice(0, 3)) return { score: 2, label: `Nearby area (PIN ${location.slice(0, 3)}xxx)` }
    return null
  }
  const term = location.toLowerCase()
  const city = address.city.toLowerCase()
  if (city === term) return { score: 3, label: `In ${address.city}` }
  if (city.includes(term) || term.includes(city)) return { score: 2, label: `In ${address.city}` }
  if (address.state.toLowerCase() === term) return { score: 1, label: `In ${address.state}` }
  return null
}

export async function searchProviders(query = {}) {
  const service = cleanString(query.service)
  const location = cleanString(query.location).slice(0, 60)
  const types = cleanString(query.type)
    .split(',')
    .filter((t) => PROVIDER_TYPES.includes(t))
  const sort = SORTS.includes(query.sort) ? query.sort : 'relevance'
  const availableToday = query.availableToday === 'true'
  const emergency = query.emergency === 'true'
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)

  const profiles = await prisma.providerProfile.findMany({
    where: {
      ...PUBLIC_WHERE,
      ...(service && { services: { some: { slug: service, isActive: true } } }),
      ...(types.length && { providerType: { in: types } }),
      ...(emergency && { emergencyAvailable: true }),
      ...(availableToday && { workingDays: { has: todayCodeIST() } }),
    },
    include: LISTING_INCLUDE,
  })

  const matched = profiles
    .map((profile) => ({ profile, match: matchLocation(baseAddressOf(profile), location) }))
    .filter((row) => row.match)

  const byExperience = (a, b) => (b.profile.experienceYears ?? 0) - (a.profile.experienceYears ?? 0)
  const byNewest = (a, b) => new Date(b.profile.reviewedAt) - new Date(a.profile.reviewedAt)
  matched.sort((a, b) =>
    sort === 'experience' ? byExperience(a, b) : sort === 'newest' ? byNewest(a, b) : b.match.score - a.match.score || byExperience(a, b),
  )

  const total = matched.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(page, pages)
  const items = matched
    .slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
    .map(({ profile, match }) => serializePublicProvider(profile, { match: match.label }))

  return { items, total, page: current, pages, pageSize: PAGE_SIZE, filters: { service, location, types, sort, availableToday, emergency } }
}

async function loadPublicProfile(id) {
  const profile = await prisma.providerProfile.findFirst({ where: { id, ...PUBLIC_WHERE }, include: LISTING_INCLUDE })
  if (!profile) throw ApiError.notFound('This electrician profile is not available')
  return profile
}

export async function getPublicProvider(id) {
  const profile = await loadPublicProfile(id)
  const address = baseAddressOf(profile)

  // Other verified providers in the same city offering at least one of the same services.
  const similar = address
    ? await prisma.providerProfile.findMany({
        where: {
          ...PUBLIC_WHERE,
          id: { not: profile.id },
          user: { status: 'ACTIVE', addresses: { some: { city: { equals: address.city, mode: 'insensitive' } } } },
          services: { some: { slug: { in: profile.services.map((s) => s.slug) } } },
        },
        include: LISTING_INCLUDE,
        take: 3,
        orderBy: { experienceYears: 'desc' },
      })
    : []

  return {
    provider: serializePublicProvider(profile, { detail: true }),
    similar: similar.map((p) => serializePublicProvider(p)),
  }
}

// Profile photos of verified providers are public; every other document stays private.
export async function getPublicPhoto(id) {
  const profile = await prisma.providerProfile.findFirst({ where: { id, ...PUBLIC_WHERE }, select: { id: true } })
  if (!profile) throw ApiError.notFound('Photo not found')
  const photo = await prisma.providerDocument.findUnique({
    where: { profileId_type: { profileId: profile.id, type: 'PROFILE_PHOTO' } },
  })
  if (!photo) throw ApiError.notFound('Photo not found')
  await assertFileExists(photo.storedName)
  return { path: resolvePath(photo.storedName), mimeType: photo.mimeType }
}