import * as service from '../services/providerProfileService.js'
import { sendStoredFile } from '../utils/sendStoredFile.js'

export async function getMine(req, res) {
  res.json({ success: true, data: await service.getMyProfile(req.user.id) })
}

export async function updateProfessional(req, res) {
  res.json({ success: true, message: 'Professional information saved', data: await service.updateProfessional(req.user.id, req.body) })
}

export async function updateQualifications(req, res) {
  res.json({ success: true, message: 'Qualification details saved', data: await service.updateQualifications(req.user.id, req.body) })
}

export async function updateLocation(req, res) {
  res.json({ success: true, message: 'Location and availability saved', data: await service.updateLocation(req.user.id, req.body) })
}

export async function updateAvailability(req, res) {
  res.json({ success: true, message: 'Availability saved', data: await service.updateAvailability(req.user.id, req.body) })
}

export async function uploadDocument(req, res) {
  res.json({ success: true, message: 'Document uploaded', data: await service.uploadDocument(req.user.id, req.params.type, req.file) })
}

export async function deleteDocument(req, res) {
  res.json({ success: true, message: 'Document removed', data: await service.deleteDocument(req.user.id, req.params.type) })
}

export async function downloadDocument(req, res) {
  sendStoredFile(res, await service.getDocumentFile({ userId: req.user.id }, req.params.type))
}

export async function submit(req, res) {
  res.json({ success: true, message: 'Profile submitted for verification', data: await service.submitForReview(req.user.id, req.body) })
}