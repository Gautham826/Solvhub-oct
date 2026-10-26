// Public view of a VERIFIED provider (search results and profile page).
// Never exposes contact details, street address, ID numbers or private documents.
// Weekday in India (IST) so "available today" matches the customer's day.
export function todayCodeIST(now = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(now)
  return weekday.toUpperCase().slice(0, 3)
}

export function baseAddressOf(profile) {
  const addresses = profile.user?.addresses || []
  return addresses.find((a) => a.isDefault) || addresses[0] || null
}

export function serializePublicProvider(profile, { detail = false, match = null } = {}) {
  const address = baseAddressOf(profile)
  const hasPhoto = (profile.documents || []).some((d) => d.type === 'PROFILE_PHOTO')
  const today = todayCodeIST()

  return {
    id: profile.id,
    fullName: profile.user.fullName,
    providerType: profile.providerType,
    experienceYears: profile.experienceYears,
    qualification: profile.qualification,
    licenceOnFile: Boolean(profile.licenceNumber),
    skills: profile.skills,
    services: profile.services.map((s) => ({ slug: s.slug, name: s.name, icon: s.icon, ...(detail && { description: s.description }) })),
    area: address && { city: address.city, state: address.state, pincode: address.pincode },
    serviceRadiusKm: profile.serviceRadiusKm,
    workingDays: profile.workingDays,
    workStartTime: profile.workStartTime,
    workEndTime: profile.workEndTime,
    emergencyAvailable: profile.emergencyAvailable,
    acceptingRequests: profile.acceptingRequests,
    ratingAverage: profile.ratingAverage,
    ratingCount: profile.ratingCount,
    availableToday: profile.workingDays.includes(today),
    hasPhoto,
    verifiedAt: profile.reviewedAt,
    ...(match && { match }),
    ...(detail && {
      bio: profile.bio,
      workArrangement: profile.workArrangement,
      memberSince: profile.user.createdAt,
    }),
  }
}