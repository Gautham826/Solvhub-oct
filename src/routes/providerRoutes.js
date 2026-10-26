import { Router } from 'express'
import * as controller from '../controllers/providerProfileController.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { singleFile } from '../middleware/upload.js'
import { ROLES } from '../config/roles.js'

const router = Router()

// Every provider route requires an authenticated PROVIDER.
router.use(authenticate, authorize(ROLES.PROVIDER))

router.get('/profile', controller.getMine)
router.put('/profile/professional', controller.updateProfessional)
router.put('/profile/qualifications', controller.updateQualifications)
router.put('/profile/location', controller.updateLocation)
router.put('/availability', controller.updateAvailability)
router.post('/profile/documents/:type', singleFile, controller.uploadDocument)
router.get('/profile/documents/:type', controller.downloadDocument)
router.delete('/profile/documents/:type', controller.deleteDocument)
router.post('/profile/submit', controller.submit)

export default router