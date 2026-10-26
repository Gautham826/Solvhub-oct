import { DOCUMENT_SLUGS, REQUIRED_DOCUMENTS } from '../constants/providerProfile.js'

// Include needed to serialize a full provider profile.
export const PROVIDER_PROFILE_INCLUDE = {
  services: { select: { id: true, slug: true, name: true, icon: true }, orderBy: { sortOrder: 'asc' } },
  documents: true,
  user: { include: { addresses: true } },
  reviewedBy: { select: { fullName: true } },
}

// Which onboarding sections are complete (drives the stepper and the submit button).
export function profileCompletion(profile) {
  const address = defaultAddress(profile.user)
  const uploaded = new Set(profile.documents.map((d) => d.type))
  const sections = {
    professional: Boolean(profile.providerType && profile.experienceYears !== null && profile.workArrangement && profile.skills.length && profile.services.length),
    qualifications: Boolean(profile.qualification && profile.idType && profile.idNumberLast4),
    documents: REQUIRED_DOCUMENTS.every((type) => uploaded.has(type)),
    location: Boolean(address && profile.serviceRadiusKm && profile.workingDays.length && profile.workStartTime && profile.workEndTime),
  }
  return { ...sections, complete: Object.values(sections).every(Boolean) }
}

function defaultAddress(user) {
  return user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0] || null
}

export function serializeDocument(doc) {
  return {
    type: doc.type,
    slug: DOCUMENT_SLUGS[doc.type],
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    uploadedAt: doc.createdAt,
  }
}

// `forAdmin` adds internal review notes that the provider never sees.
export function serializeProviderProfile(profile, { forAdmin = false } = {}) {
  const address = defaultAddress(profile.user)
  const editable = profile.verificationStatus === 'INCOMPLETE' || profile.verificationStatus === 'REJECTED'
  const completion = profileCompletion(profile)

  return {
    id: profile.id,
    verificationStatus: profile.verificationStatus,
    account: profile.user && {
      id: profile.user.id,
      fullName: profile.user.fullName,
      email: profile.user.email,
      phone: profile.user.phone,
      status: profile.user.status,
      createdAt: profile.user.createdAt,
    },
    professional: {
      providerType: profile.providerType,
      experienceYears: profile.experienceYears,
      workArrangement: profile.workArrangement,
      bio: profile.bio,
      skills: profile.skills,
      services: profile.services,
    },
    qualifications: {
      qualification: profile.qualification,
      institute: profile.institute,
      idType: profile.idType,
      idNumberLast4: profile.idNumberLast4,
      licenceNumber: profile.licenceNumber,
      licenceAuthority: profile.licenceAuthority,
      licenceValidUntil: profile.licenceValidUntil,
    },
    documents: profile.documents.map(serializeDocument),
    location: {
      baseAddress: address && {
        line1: address.line1,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      serviceRadiusKm: profile.serviceRadiusKm,
      workingDays: profile.workingDays,
      workStartTime: profile.workStartTime,
      workEndTime: profile.workEndTime,
      emergencyAvailable: profile.emergencyAvailable,
      acceptingRequests: profile.acceptingRequests,
    },
    review: {
      submittedAt: profile.submittedAt,
      reviewedAt: profile.reviewedAt,
      reviewedBy: profile.reviewedBy?.fullName || null,
      rejectionReason: profile.rejectionReason,
      ...(forAdmin && { notes: profile.reviewNotes }),
    },
    completion,
    canEdit: editable,
    canSubmit: editable && completion.complete,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}