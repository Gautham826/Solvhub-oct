// Allowed values for the provider professional profile.
// Keep in sync with client/src/content/providerOnboarding.js
export const PROVIDER_TYPES = ['PROFESSIONAL', 'STUDENT', 'RETIRED', 'OTHER']
export const WORK_ARRANGEMENTS = ['INDEPENDENT', 'PROPRIETORSHIP', 'EMPLOYED']
export const QUALIFICATIONS = ['ITI_ELECTRICIAN', 'DIPLOMA_ELECTRICAL', 'DEGREE_ELECTRICAL', 'APPRENTICESHIP', 'WIREMAN_PERMIT', 'EXPERIENCE_ONLY', 'STUDYING']
export const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Identity document types and the format of their numbers (spaces/hyphens removed).
export const ID_TYPES = {
  AADHAAR: { label: 'Aadhaar', pattern: /^[2-9]\d{11}$/ },
  PAN: { label: 'PAN card', pattern: /^[A-Z]{5}\d{4}[A-Z]$/ },
  VOTER_ID: { label: 'Voter ID', pattern: /^[A-Z]{3}\d{7}$/ },
  DRIVING_LICENCE: { label: 'Driving licence', pattern: /^[A-Z]{2}[0-9A-Z]{8,16}$/ },
  PASSPORT: { label: 'Passport', pattern: /^[A-Z]\d{7}$/ },
}

// Verification documents: URL slug <-> database enum, accepted file types, and whether required.
const PDF_OR_IMAGE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const DOCUMENT_TYPES = {
  'id-proof': { type: 'ID_PROOF', accept: PDF_OR_IMAGE, required: true },
  'qualification-certificate': { type: 'QUALIFICATION_CERTIFICATE', accept: PDF_OR_IMAGE, required: true },
  'electrical-licence': { type: 'ELECTRICAL_LICENCE', accept: PDF_OR_IMAGE, required: false },
  'profile-photo': { type: 'PROFILE_PHOTO', accept: ['image/jpeg', 'image/png', 'image/webp'], required: true },
}
export const REQUIRED_DOCUMENTS = Object.values(DOCUMENT_TYPES).filter((d) => d.required).map((d) => d.type)
export const DOCUMENT_SLUGS = Object.fromEntries(Object.entries(DOCUMENT_TYPES).map(([slug, d]) => [d.type, slug]))

export const LIMITS = { skills: 15, skillLength: 40, bio: 600, experience: 60, radiusMin: 1, radiusMax: 50 }