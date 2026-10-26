import { Router } from 'express'
import * as controller from '../controllers/providerDirectoryController.js'

// Public directory of verified providers (no login needed to browse).
const router = Router()

router.get('/', controller.search)
router.get('/:id', controller.detail)
router.get('/:id/photo', controller.photo)

export default router