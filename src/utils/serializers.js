// Shapes database records into safe API responses (never expose passwordHash).
export function serializeUser(user) {
  if (!user) return null
  const defaultAddress = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0] || null

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    defaultAddress: defaultAddress && {
      id: defaultAddress.id,
      label: defaultAddress.label,
      line1: defaultAddress.line1,
      landmark: defaultAddress.landmark,
      city: defaultAddress.city,
      state: defaultAddress.state,
      pincode: defaultAddress.pincode,
    },
    providerProfile: user.providerProfile
      ? { verificationStatus: user.providerProfile.verificationStatus }
      : undefined,
  }
}