import { Router } from 'express'
import { overview } from '../controllers/adminController.js'
import * as verification from '../controllers/providerVerificationController.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { ROLES } from '../config/roles.js'

const router = Router()

// Every admin route requires an authenticated ADMIN.
router.use(authenticate, authorize(ROLES.ADMIN))

router.get('/overview', overview)

// Provider verification workspace
router.get('/providers', verification.list)
router.get('/providers/:id', verification.detail)
router.get('/providers/:id/documents/:type', verification.downloadDocument)
router.post('/providers/:id/approve', verification.approve)
router.post('/providers/:id/reject', verification.reject)

export default router