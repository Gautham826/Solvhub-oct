import { randomBytes } from 'node:crypto'
import prisma from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { PINCODE_REGEX, assertValid, cleanString } from '../utils/validation.js'
import { detectFileType } from '../utils/fileType.js'
import { REQUEST_INCLUDE, serializeRequest } from '../utils/serviceRequestSerializer.js'
import { assertFileExists, resolvePath, saveFile } from './fileStorage.js'
import {
  MAX_AMOUNT,
  MAX_ATTACHMENTS,
  MAX_DAYS_AHEAD,
  OPEN_STATUSES,
  STATUS_GROUPS,
  TIME_SLOTS,
  URGENCIES,
} from '../constants/serviceRequest.js'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// "YYYY-MM-DD" for a date in India (IST), optionally shifted by whole days.
function isoDateIST(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

// Slot end hours in India time (24h). A slot is closed once its end hour has passed today.
const SLOT_END_HOUR = { MORNING: 12, AFTERNOON: 16, EVENING: 20 }

function currentHourIST() {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date())
  return Number(hour) % 24
}

function newReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  return 'SR-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

function parseAmount(value, { required }) {
  if (value === undefined || value === null || value === '') return required ? NaN : null
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= MAX_AMOUNT ? n : NaN
}

async function loadRequest(id) {
  const request = await prisma.serviceRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE })
  if (!request) throw ApiError.notFound('Service request not found')
  return request
}

async function providerProfileIdOf(userId) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) throw ApiError.forbidden()
  return profile.id
}

// Loads a request and checks that the signed-in user is part of it.
async function loadForViewer(id, user) {
  const request = await loadRequest(id)
  if (user.role === 'CUSTOMER' && request.customerId === user.id) return request
  if (user.role === 'PROVIDER' && request.providerId === (await providerProfileIdOf(user.id))) return request
  throw ApiError.notFound('Service request not found')
}

// --- Customer --------------------------------------------

export async function createRequest(customerId, input = {}) {
  const provider = await prisma.providerProfile.findFirst({
    where: { id: cleanString(input.providerId), verificationStatus: 'APPROVED', user: { status: 'ACTIVE' } },
    include: { services: { select: { id: true, slug: true, name: true } } },
  })
  if (!provider) throw ApiError.badRequest('This electrician is not available for requests')
  if (!provider.acceptingRequests) throw ApiError.conflict('This electrician is not accepting new requests right now')

  const category = provider.services.find((s) => s.slug === cleanString(input.service))
  const description = cleanString(input.description)
  const urgency = URGENCIES.includes(input.urgency) ? input.urgency : 'NORMAL'
  const slot = urgency === 'EMERGENCY' ? 'ASAP' : cleanString(input.preferredSlot)
  const date = cleanString(input.preferredDate)
  const a = input.address || {}
  const address = {
    addressLine1: cleanString(a.line1),
    landmark: cleanString(a.landmark) || null,
    city: cleanString(a.city),
    state: cleanString(a.state),
    pincode: cleanString(a.pincode),
  }
  const accessNotes = cleanString(input.accessNotes)

  assertValid({
    service: !category ? 'Choose one of the services this electrician offers' : null,
    description:
      description.length < 20
        ? 'Describe the problem in at least 20 characters'
        : description.length > 1000
          ? 'Keep the description under 1000 characters'
          : null,
    preferredSlot: !TIME_SLOTS.includes(slot)
      ? 'Choose a time slot'
      : slot !== 'ASAP' && date === isoDateIST(0) && currentHourIST() >= SLOT_END_HOUR[slot]
        ? 'That time slot has already passed today. Choose a later slot or another day'
        : null,
    preferredDate:
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < isoDateIST(0) || date > isoDateIST(MAX_DAYS_AHEAD)
        ? `Choose a date between today and the next ${MAX_DAYS_AHEAD} days`
        : null,
    'address.line1': address.addressLine1.length < 5 ? 'Enter the service address' : null,
    'address.city': address.city.length < 2 ? 'Enter the city' : null,
    'address.state': address.state.length < 2 ? 'Select the state' : null,
    'address.pincode': !PINCODE_REGEX.test(address.pincode) ? 'Enter a valid 6-digit PIN code' : null,
    accessNotes: accessNotes.length > 500 ? 'Keep the instructions under 500 characters' : null,
  })

  const duplicate = await prisma.serviceRequest.findFirst({
    where: { customerId, providerId: provider.id, status: 'REQUESTED' },
    select: { reference: true },
  })
  if (duplicate) {
    throw ApiError.conflict(`You already have a pending request (${duplicate.reference}) with this electrician. Wait for a reply or cancel it first.`)
  }

  const created = await prisma.serviceRequest.create({
    data: {
      reference: newReference(),
      customerId,
      providerId: provider.id,
      categoryId: category.id,
      urgency,
      title: category.name,
      description,
      preferredDate: new Date(`${date}T00:00:00Z`),
      preferredSlot: slot,
      ...address,
      accessNotes: accessNotes || null,
      events: { create: { status: 'REQUESTED', actorRole: 'CUSTOMER' } },
    },
    include: REQUEST_INCLUDE,
  })
  return serializeRequest(created, 'CUSTOMER')
}

function listWhere(base, group) {
  return STATUS_GROUPS[group] ? { ...base, status: { in: STATUS_GROUPS[group] } } : base
}

async function countsFor(base) {
  const rows = await prisma.serviceRequest.groupBy({ by: ['status'], where: base, _count: { _all: true } })
  const counts = { REQUESTED: 0, ACCEPTED: 0, DECLINED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 }
  rows.forEach((r) => (counts[r.status] = r._count._all))
  return counts
}

export async function listCustomerRequests(customerId, { group } = {}) {
  const base = { customerId }
  const [requests, counts, spent] = await Promise.all([
    prisma.serviceRequest.findMany({ where: listWhere(base, group), include: REQUEST_INCLUDE, orderBy: { createdAt: 'desc' }, take: 100 }),
    countsFor(base),
    prisma.serviceRequest.aggregate({ where: { ...base, status: 'COMPLETED' }, _sum: { finalAmount: true } }),
  ])
  return { items: requests.map((r) => serializeRequest(r, 'CUSTOMER')), counts, totalSpent: spent._sum.finalAmount || 0 }
}

export async function cancelRequest(customerId, id, input = {}) {
  const request = await loadRequest(id)
  if (request.customerId !== customerId) throw ApiError.notFound('Service request not found')
  const reason = cleanString(input.reason).slice(0, 300)
  return transition(request, ['REQUESTED', 'ACCEPTED'], 'CANCELLED', 'CUSTOMER', {
    data: { cancelReason: reason || null, cancelledAt: new Date() },
    note: reason || null,
    conflict: 'This request can no longer be cancelled because work has already started or it is closed.',
  })
}

export async function addAttachment(customerId, id, file) {
  const request = await loadRequest(id)
  if (request.customerId !== customerId) throw ApiError.notFound('Service request not found')
  if (!['REQUESTED', 'ACCEPTED'].includes(request.status)) throw ApiError.conflict('Photos can only be added before work starts')
  if (request.attachments.length >= MAX_ATTACHMENTS) throw ApiError.badRequest(`You can attach up to ${MAX_ATTACHMENTS} photos`)
  if (!file) throw ApiError.badRequest('Choose a photo to upload')
  const detected = detectFileType(file.buffer)
  if (!detected || !IMAGE_TYPES.includes(detected.mime)) throw ApiError.badRequest('Upload a JPG, PNG or WEBP photo')

  const storedName = await saveFile(file.buffer, detected.ext)
  await prisma.requestAttachment.create({
    data: {
      requestId: id,
      storedName,
      originalName: cleanString(file.originalname).slice(0, 150) || `photo.${detected.ext}`,
      mimeType: detected.mime,
      sizeBytes: file.size,
    },
  })
  return serializeRequest(await loadRequest(id), 'CUSTOMER')
}

// --- Shared ----------------------------------------------

export async function getRequest(id, user) {
  return serializeRequest(await loadForViewer(id, user), user.role)
}

export async function getAttachmentFile(id, attachmentId, user) {
  const request = await loadForViewer(id, user)
  const attachment = request.attachments.find((a) => a.id === attachmentId)
  if (!attachment) throw ApiError.notFound('Photo not found')
  await assertFileExists(attachment.storedName)
  return { path: resolvePath(attachment.storedName), mimeType: attachment.mimeType, originalName: attachment.originalName }
}

// Moves a request from one of `from` to `to` and records a timeline event.
// The status check inside the update makes it safe if both parties act at once.
async function transition(request, from, to, actorRole, { data = {}, note = null, conflict }) {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.serviceRequest.updateMany({ where: { id: request.id, status: { in: from } }, data: { status: to, ...data } })
    if (!count) throw ApiError.conflict(conflict)
    await tx.requestEvent.create({ data: { requestId: request.id, status: to, actorRole, note } })
  })
  return serializeRequest(await loadRequest(request.id), actorRole)
}

// --- Provider --------------------------------------------

async function loadForProvider(userId, id) {
  const request = await loadRequest(id)
  if (request.providerId !== (await providerProfileIdOf(userId))) throw ApiError.notFound('Service request not found')
  return request
}

export async function listProviderRequests(userId, { view = 'incoming', group } = {}) {
  const providerId = await providerProfileIdOf(userId)
  const base = { providerId }
  const where =
    view === 'incoming'
      ? { ...base, status: 'REQUESTED' }
      : // Jobs = requests the provider accepted at some point (not ones cancelled while still pending).
        listWhere({ ...base, acceptedAt: { not: null } }, group)
  const [requests, counts, jobCounts, earned] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      // Emergencies first in the incoming queue, then oldest first so nobody waits too long.
      orderBy: view === 'incoming' ? [{ urgency: 'desc' }, { createdAt: 'asc' }] : { updatedAt: 'desc' },
      take: 100,
    }),
    countsFor(base),
    countsFor({ ...base, acceptedAt: { not: null } }),
    prisma.serviceRequest.aggregate({ where: { ...base, status: 'COMPLETED' }, _sum: { finalAmount: true } }),
  ])
  return { items: requests.map((r) => serializeRequest(r, 'PROVIDER')), counts, jobCounts, totalEarned: earned._sum.finalAmount || 0 }
}

export async function acceptRequest(userId, id, input = {}) {
  const request = await loadForProvider(userId, id)
  const estimate = parseAmount(input.estimateAmount, { required: false })
  const note = cleanString(input.note)
  assertValid({
    estimateAmount: Number.isNaN(estimate) ? `Enter an estimate in whole rupees (0\u2013${MAX_AMOUNT})` : null,
    note: note.length > 500 ? 'Keep the note under 500 characters' : null,
  })
  return transition(request, ['REQUESTED'], 'ACCEPTED', 'PROVIDER', {
    data: { acceptedAt: new Date(), estimateAmount: estimate, providerNote: note || null },
    note: note || null,
    conflict: 'This request is no longer waiting for a reply (it may have been cancelled).',
  })
}

export async function declineRequest(userId, id, input = {}) {
  const request = await loadForProvider(userId, id)
  const reason = cleanString(input.reason)
  assertValid({ reason: reason.length < 5 || reason.length > 300 ? 'Give the customer a short reason (5\u2013300 characters)' : null })
  return transition(request, ['REQUESTED'], 'DECLINED', 'PROVIDER', {
    data: { declinedAt: new Date(), declineReason: reason },
    note: reason,
    conflict: 'This request is no longer waiting for a reply (it may have been cancelled).',
  })
}

export async function startJob(userId, id) {
  const request = await loadForProvider(userId, id)
  return transition(request, ['ACCEPTED'], 'IN_PROGRESS', 'PROVIDER', {
    data: { startedAt: new Date() },
    conflict: 'Only accepted jobs can be started.',
  })
}

export async function completeJob(userId, id, input = {}) {
  const request = await loadForProvider(userId, id)
  const amount = parseAmount(input.finalAmount, { required: true })
  const notes = cleanString(input.notes)
  assertValid({
    finalAmount: Number.isNaN(amount) ? `Enter the final amount in whole rupees (0\u2013${MAX_AMOUNT})` : null,
    notes: notes.length > 1000 ? 'Keep the work summary under 1000 characters' : null,
  })
  return transition(request, ['IN_PROGRESS'], 'COMPLETED', 'PROVIDER', {
    data: { completedAt: new Date(), finalAmount: amount, completionNotes: notes || null },
    note: notes || null,
    conflict: 'Only jobs in progress can be completed.',
  })
}

// Counts for the provider dashboard.
export async function providerSummary(userId) {
  const providerId = await providerProfileIdOf(userId)
  const [counts, earned, latest] = await Promise.all([
    countsFor({ providerId }),
    prisma.serviceRequest.aggregate({ where: { providerId, status: 'COMPLETED' }, _sum: { finalAmount: true } }),
    prisma.serviceRequest.findMany({
      where: { providerId, status: { in: OPEN_STATUSES } },
      include: REQUEST_INCLUDE,
      orderBy: [{ urgency: 'desc' }, { createdAt: 'asc' }],
      take: 3,
    }),
  ])
  return { counts, totalEarned: earned._sum.finalAmount || 0, latest: latest.map((r) => serializeRequest(r, 'PROVIDER')) }
}