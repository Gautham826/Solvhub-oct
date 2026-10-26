import prisma from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { PINCODE_REGEX, assertValid, cleanString } from '../utils/validation.js'
import { detectFileType } from '../utils/fileType.js'
import { PROVIDER_PROFILE_INCLUDE, serializeProviderProfile, profileCompletion } from '../utils/providerSerializer.js'
import { assertFileExists, removeFile, resolvePath, saveFile } from './fileStorage.js'
import {
  DOCUMENT_TYPES,
  ID_TYPES,
  LIMITS,
  PROVIDER_TYPES,
  QUALIFICATIONS,
  WEEK_DAYS,
  WORK_ARRANGEMENTS,
} from '../constants/providerProfile.js'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

async function loadProfile(userId) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId }, include: PROVIDER_PROFILE_INCLUDE })
  if (!profile) throw ApiError.notFound('Provider profile not found')
  return profile
}

// Profiles can only be changed before submission or after a rejection.
async function loadEditableProfile(userId) {
  const profile = await loadProfile(userId)
  if (profile.verificationStatus === 'PENDING') {
    throw ApiError.conflict('Your profile is under review and cannot be changed right now.')
  }
  if (profile.verificationStatus === 'APPROVED') {
    throw ApiError.conflict('Your profile is already verified. Contact support to change verified details.')
  }
  return profile
}

async function respond(userId) {
  return serializeProviderProfile(await loadProfile(userId))
}

export async function getMyProfile(userId) {
  return respond(userId)
}

// --- Step 2: professional information --------------------

export async function updateProfessional(userId, input = {}) {
  const profile = await loadEditableProfile(userId)

  const experienceYears = Number(input.experienceYears)
  const skills = Array.isArray(input.skills)
    ? [...new Set(input.skills.map(cleanString).filter(Boolean))]
    : []
  const serviceSlugs = Array.isArray(input.services) ? [...new Set(input.services.map(cleanString))] : []
  const bio = cleanString(input.bio)

  const services = serviceSlugs.length
    ? await prisma.serviceCategory.findMany({ where: { slug: { in: serviceSlugs }, isActive: true }, select: { id: true } })
    : []

  assertValid({
    providerType: !PROVIDER_TYPES.includes(input.providerType) ? 'Select your provider category' : null,
    experienceYears:
      !Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > LIMITS.experience
        ? `Enter your years of experience (0\u2013${LIMITS.experience})`
        : null,
    workArrangement: !WORK_ARRANGEMENTS.includes(input.workArrangement) ? 'Select how you work' : null,
    skills: !skills.length
      ? 'Add at least one skill'
      : skills.length > LIMITS.skills
        ? `Add up to ${LIMITS.skills} skills`
        : skills.some((s) => s.length < 2 || s.length > LIMITS.skillLength)
          ? `Each skill must be 2\u2013${LIMITS.skillLength} characters`
          : null,
    services: !services.length || services.length !== serviceSlugs.length ? 'Select at least one valid service' : null,
    bio: bio.length > LIMITS.bio ? `Keep your introduction under ${LIMITS.bio} characters` : null,
  })

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      providerType: input.providerType,
      experienceYears,
      workArrangement: input.workArrangement,
      bio: bio || null,
      skills,
      services: { set: services },
    },
  })
  return respond(userId)
}

// --- Step 3: qualifications & identity -------------------

export async function updateQualifications(userId, input = {}) {
  const profile = await loadEditableProfile(userId)

  const idType = cleanString(input.idType)
  const idNumber = cleanString(input.idNumber).toUpperCase().replace(/[\s-]/g, '')
  // The ID number may be left blank when an ID of the same type is already on file.
  const keepExistingId = !idNumber && profile.idNumberLast4 && profile.idType === idType
  const licenceNumber = cleanString(input.licenceNumber).toUpperCase()
  const licenceAuthority = cleanString(input.licenceAuthority)
  const institute = cleanString(input.institute)
  const licenceValidUntil = input.licenceValidUntil ? new Date(input.licenceValidUntil) : null

  assertValid({
    qualification: !QUALIFICATIONS.includes(input.qualification) ? 'Select your highest qualification' : null,
    institute: institute.length > 120 ? 'Keep the institute name under 120 characters' : null,
    idType: !ID_TYPES[idType] ? 'Select an identity document' : null,
    idNumber:
      ID_TYPES[idType] && !keepExistingId && !ID_TYPES[idType].pattern.test(idNumber)
        ? `Enter a valid ${ID_TYPES[idType].label} number`
        : null,
    licenceNumber: licenceNumber.length > 40 ? 'Licence number is too long' : null,
    licenceAuthority:
      licenceNumber && licenceAuthority.length < 3
        ? 'Enter the authority that issued your licence'
        : licenceAuthority.length > 120
          ? 'Keep the authority name under 120 characters'
          : null,
    licenceValidUntil:
      licenceValidUntil && (Number.isNaN(licenceValidUntil.getTime()) || licenceValidUntil < new Date())
        ? 'Licence validity must be a future date'
        : null,
  })

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      qualification: input.qualification,
      institute: institute || null,
      idType,
      idNumberLast4: keepExistingId ? profile.idNumberLast4 : idNumber.slice(-4),
      licenceNumber: licenceNumber || null,
      licenceAuthority: licenceNumber ? licenceAuthority : null,
      licenceValidUntil: licenceNumber ? licenceValidUntil : null,
    },
  })
  return respond(userId)
}

// --- Step 3: documents -----------------------------------

function documentConfig(slug) {
  const config = DOCUMENT_TYPES[slug]
  if (!config) throw ApiError.notFound('Unknown document type')
  return config
}

export async function uploadDocument(userId, slug, file) {
  const config = documentConfig(slug)
  const profile = await loadEditableProfile(userId)
  if (!file) throw ApiError.badRequest('Choose a file to upload')

  const detected = detectFileType(file.buffer)
  if (!detected || !config.accept.includes(detected.mime)) {
    const allowed = config.accept.includes('application/pdf') ? 'PDF, JPG, PNG or WEBP' : 'JPG, PNG or WEBP image'
    throw ApiError.badRequest(`Unsupported file. Upload a ${allowed}.`)
  }

  const storedName = await saveFile(file.buffer, detected.ext)
  const previous = profile.documents.find((d) => d.type === config.type)
  const data = {
    originalName: cleanString(file.originalname).slice(0, 150) || `document.${detected.ext}`,
    storedName,
    mimeType: detected.mime,
    sizeBytes: file.size,
    createdAt: new Date(),
  }

  try {
    await prisma.providerDocument.upsert({
      where: { profileId_type: { profileId: profile.id, type: config.type } },
      create: { profileId: profile.id, type: config.type, ...data },
      update: data,
    })
  } catch (error) {
    await removeFile(storedName)
    throw error
  }
  if (previous) await removeFile(previous.storedName)
  return respond(userId)
}

export async function deleteDocument(userId, slug) {
  const config = documentConfig(slug)
  const profile = await loadEditableProfile(userId)
  const doc = profile.documents.find((d) => d.type === config.type)
  if (!doc) throw ApiError.notFound('Document not found')
  await prisma.providerDocument.delete({ where: { id: doc.id } })
  await removeFile(doc.storedName)
  return respond(userId)
}

// Returns what the controller needs to stream a stored document.
export async function getDocumentFile(profileWhere, slug) {
  const config = documentConfig(slug)
  const profile = await prisma.providerProfile.findUnique({ where: profileWhere, select: { id: true } })
  if (!profile) throw ApiError.notFound('Provider profile not found')
  const doc = await prisma.providerDocument.findUnique({
    where: { profileId_type: { profileId: profile.id, type: config.type } },
  })
  if (!doc) throw ApiError.notFound('Document not found')
  await assertFileExists(doc.storedName)
  return { path: resolvePath(doc.storedName), mimeType: doc.mimeType, originalName: doc.originalName }
}

// --- Step 4: location & availability ---------------------

export async function updateLocation(userId, input = {}) {
  const profile = await loadEditableProfile(userId)
  const a = input.baseAddress || {}
  const address = {
    line1: cleanString(a.line1),
    landmark: cleanString(a.landmark) || null,
    city: cleanString(a.city),
    state: cleanString(a.state),
    pincode: cleanString(a.pincode),
  }
  const serviceRadiusKm = Number(input.serviceRadiusKm)
  const workingDays = Array.isArray(input.workingDays) ? WEEK_DAYS.filter((d) => input.workingDays.includes(d)) : []
  const { workStartTime, workEndTime } = input

  assertValid({
    'baseAddress.line1': address.line1.length < 5 ? 'Enter your base / shop address' : null,
    'baseAddress.city': address.city.length < 2 ? 'Enter your city' : null,
    'baseAddress.state': address.state.length < 2 ? 'Select your state' : null,
    'baseAddress.pincode': !PINCODE_REGEX.test(address.pincode) ? 'Enter a valid 6-digit PIN code' : null,
    serviceRadiusKm:
      !Number.isInteger(serviceRadiusKm) || serviceRadiusKm < LIMITS.radiusMin || serviceRadiusKm > LIMITS.radiusMax
        ? `Service radius must be ${LIMITS.radiusMin}\u2013${LIMITS.radiusMax} km`
        : null,
    workingDays: !workingDays.length ? 'Select at least one working day' : null,
    workStartTime: !TIME_REGEX.test(workStartTime || '') ? 'Enter a start time' : null,
    workEndTime: !TIME_REGEX.test(workEndTime || '')
      ? 'Enter an end time'
      : TIME_REGEX.test(workStartTime || '') && workEndTime <= workStartTime
        ? 'End time must be after the start time'
        : null,
  })

  const existing = profile.user.addresses.find((x) => x.isDefault) || profile.user.addresses[0]
  await prisma.$transaction([
    existing
      ? prisma.address.update({ where: { id: existing.id }, data: { ...address, isDefault: true } })
      : prisma.address.create({ data: { ...address, label: 'Work base', isDefault: true, userId } }),
    prisma.providerProfile.update({
      where: { id: profile.id },
      data: { serviceRadiusKm, workingDays, workStartTime, workEndTime, emergencyAvailable: input.emergencyAvailable === true },
    }),
  ])
  return respond(userId)
}

// --- Availability (editable at any time, also after approval) ---

export async function updateAvailability(userId, input = {}) {
  const profile = await loadProfile(userId)
  const serviceRadiusKm = Number(input.serviceRadiusKm)
  const workingDays = Array.isArray(input.workingDays) ? WEEK_DAYS.filter((d) => input.workingDays.includes(d)) : []
  const { workStartTime, workEndTime } = input

  assertValid({
    serviceRadiusKm:
      !Number.isInteger(serviceRadiusKm) || serviceRadiusKm < LIMITS.radiusMin || serviceRadiusKm > LIMITS.radiusMax
        ? `Service radius must be ${LIMITS.radiusMin}\u2013${LIMITS.radiusMax} km`
        : null,
    workingDays: !workingDays.length ? 'Select at least one working day' : null,
    workStartTime: !TIME_REGEX.test(workStartTime || '') ? 'Enter a start time' : null,
    workEndTime: !TIME_REGEX.test(workEndTime || '')
      ? 'Enter an end time'
      : TIME_REGEX.test(workStartTime || '') && workEndTime <= workStartTime
        ? 'End time must be after the start time'
        : null,
  })

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      serviceRadiusKm,
      workingDays,
      workStartTime,
      workEndTime,
      emergencyAvailable: input.emergencyAvailable === true,
      acceptingRequests: input.acceptingRequests !== false,
    },
  })
  return respond(userId)
}

// --- Submit for verification -----------------------------

export async function submitForReview(userId, input = {}) {
  const profile = await loadEditableProfile(userId)
  const completion = profileCompletion(profile)
  if (!completion.complete) {
    throw ApiError.badRequest('Complete every section before submitting', {
      sections: Object.entries(completion)
        .filter(([key, done]) => key !== 'complete' && !done)
        .map(([key]) => key)
        .join(', '),
    })
  }
  assertValid({ declaration: input.declaration !== true ? 'Please confirm the declaration to submit' : null })

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { verificationStatus: 'PENDING', submittedAt: new Date(), rejectionReason: null },
  })
  return respond(userId)
}