import * as service from '../services/serviceRequestService.js'
import { sendStoredFile } from '../utils/sendStoredFile.js'

const ok = (res, data, message, status = 200) => res.status(status).json({ success: true, ...(message && { message }), data })

// Customer
export const create = async (req, res) => ok(res, await service.createRequest(req.user.id, req.body), 'Service request sent', 201)
export const listMine = async (req, res) => ok(res, await service.listCustomerRequests(req.user.id, req.query))
export const cancel = async (req, res) => ok(res, await service.cancelRequest(req.user.id, req.params.id, req.body), 'Request cancelled')
export const addAttachment = async (req, res) => ok(res, await service.addAttachment(req.user.id, req.params.id, req.file), 'Photo added')

// Customer or provider
export const detail = async (req, res) => ok(res, await service.getRequest(req.params.id, req.user))
export async function attachment(req, res) {
  sendStoredFile(res, await service.getAttachmentFile(req.params.id, req.params.attachmentId, req.user))
}

// Provider
export const listForProvider = async (req, res) => ok(res, await service.listProviderRequests(req.user.id, req.query))
export const summary = async (req, res) => ok(res, await service.providerSummary(req.user.id))
export const accept = async (req, res) => ok(res, await service.acceptRequest(req.user.id, req.params.id, req.body), 'Request accepted')
export const decline = async (req, res) => ok(res, await service.declineRequest(req.user.id, req.params.id, req.body), 'Request declined')
export const start = async (req, res) => ok(res, await service.startJob(req.user.id, req.params.id), 'Job started')
export const complete = async (req, res) => ok(res, await service.completeJob(req.user.id, req.params.id, req.body), 'Job completed')