import { Router } from 'express'
import * as controller from '../controllers/reviewController.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { ROLES } from '../config/roles.js'

const router = Router()

// Public: the reviews shown on an approved electrician's profile.
router.get('/by-provider/:providerId', controller.publicList)

router.use(authenticate)
router.post('/', authorize(ROLES.CUSTOMER), controller.create)
router.get('/mine', authorize(ROLES.CUSTOMER), controller.listMine)
router.get('/provider', authorize(ROLES.PROVIDER), controller.listForProvider)

export default router