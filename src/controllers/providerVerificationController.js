import * as service from '../services/providerVerificationService.js'
import { getDocumentFile } from '../services/providerProfileService.js'
import { sendStoredFile } from '../utils/sendStoredFile.js'

export async function list(req, res) {
  res.json({ success: true, data: await service.listApplications(req.query) })
}

export async function detail(req, res) {
  res.json({ success: true, data: await service.getApplication(req.params.id) })
}

export async function downloadDocument(req, res) {
  sendStoredFile(res, await getDocumentFile({ id: req.params.id }, req.params.type))
}

export async function approve(req, res) {
  res.json({ success: true, message: 'Provider approved', data: await service.approveApplication(req.params.id, req.user.id, req.body) })
}

export async function reject(req, res) {
  res.json({ success: true, message: 'Application rejected', data: await service.rejectApplication(req.params.id, req.user.id, req.body) })
}