import { CONTACT_SHARED_STATUSES } from '../constants/serviceRequest.js'

export const REQUEST_INCLUDE = {
  category: { select: { slug: true, name: true, icon: true } },
  customer: { select: { id: true, fullName: true, phone: true, email: true } },
  provider: {
    select: {
      id: true,
      providerType: true,
      experienceYears: true,
      qualification: true,
      user: { select: { fullName: true, phone: true } },
      documents: { select: { type: true } },
    },
  },
  events: { orderBy: { createdAt: 'asc' } },
  attachments: { orderBy: { createdAt: 'asc' } },
  review: { select: { id: true, rating: true, comment: true, createdAt: true } },
}

// Shapes a request for the customer or the provider. Contact details and the
// street address are only revealed once the provider has accepted.
export function serializeRequest(request, viewerRole) {
  const shared = CONTACT_SHARED_STATUSES.includes(request.status)
  const isProvider = viewerRole === 'PROVIDER'

  return {
    id: request.id,
    reference: request.reference,
    status: request.status,
    urgency: request.urgency,
    title: request.title,
    description: request.description,
    category: request.category,
    preferredDate: request.preferredDate,
    preferredSlot: request.preferredSlot,
    location: {
      // The provider sees only the area until they accept.
      addressLine1: !isProvider || shared ? request.addressLine1 : null,
      landmark: !isProvider || shared ? request.landmark : null,
      accessNotes: !isProvider || shared ? request.accessNotes : null,
      city: request.city,
      state: request.state,
      pincode: request.pincode,
    },
    amounts: { estimate: request.estimateAmount, final: request.finalAmount },
    notes: {
      provider: request.providerNote,
      decline: request.declineReason,
      cancel: request.cancelReason,
      completion: request.completionNotes,
    },
    customer: {
      fullName: request.customer.fullName,
      phone: isProvider && shared ? request.customer.phone : null,
    },
    provider: {
      id: request.provider.id,
      fullName: request.provider.user.fullName,
      providerType: request.provider.providerType,
      experienceYears: request.provider.experienceYears,
      qualification: request.provider.qualification,
      hasPhoto: request.provider.documents.some((d) => d.type === 'PROFILE_PHOTO'),
      phone: !isProvider && shared ? request.provider.user.phone : null,
    },
    review: request.review
      ? { id: request.review.id, rating: request.review.rating, comment: request.review.comment, createdAt: request.review.createdAt }
      : null,
    timeline: request.events.map((e) => ({ status: e.status, actorRole: e.actorRole, note: e.note, at: e.createdAt })),
    attachments: request.attachments.map((a) => ({ id: a.id, originalName: a.originalName, mimeType: a.mimeType, sizeBytes: a.sizeBytes })),
    dates: {
      created: request.createdAt,
      accepted: request.acceptedAt,
      declined: request.declinedAt,
      started: request.startedAt,
      completed: request.completedAt,
      cancelled: request.cancelledAt,
    },
  }
}