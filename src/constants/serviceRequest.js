// Service request rules. Keep in sync with client/src/content/serviceRequests.js
export const TIME_SLOTS = ['MORNING', 'AFTERNOON', 'EVENING', 'ASAP']
export const URGENCIES = ['NORMAL', 'EMERGENCY']
export const MAX_DAYS_AHEAD = 30
export const MAX_ATTACHMENTS = 3
export const MAX_AMOUNT = 1000000 // rupees

// Statuses grouped for the list tabs.
export const OPEN_STATUSES = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
export const STATUS_GROUPS = {
  active: OPEN_STATUSES,
  completed: ['COMPLETED'],
  closed: ['CANCELLED', 'DECLINED'],
}

// Once accepted, both sides may see each other's contact details and the full address.
export const CONTACT_SHARED_STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED']