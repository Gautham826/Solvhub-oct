import * as service from '../services/reviewService.js'

const ok = (res, data, message, status = 200) => res.status(status).json({ success: true, ...(message && { message }), data })

export const create = async (req, res) => ok(res, await service.createReview(req.user.id, req.body), 'Thank you for your review', 201)
export const listMine = async (req, res) => ok(res, await service.listCustomerReviews(req.user.id))
export const listForProvider = async (req, res) => ok(res, await service.listOwnProviderReviews(req.user.id, req.query))
export const publicList = async (req, res) => ok(res, await service.listPublicReviews(req.params.providerId, req.query))