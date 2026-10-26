import { Router } from 'express'
import * as controller from '../controllers/serviceRequestController.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { singleFile } from '../middleware/upload.js'
import { ROLES } from '../config/roles.js'

const router = Router()
const customer = authorize(ROLES.CUSTOMER)
const provider = authorize(ROLES.PROVIDER)

router.use(authenticate)

// Lists (declared before "/:id" so they are not treated as ids)
router.get('/mine', customer, controller.listMine)
router.get('/provider', provider, controller.listForProvider)
router.get('/provider/summary', provider, controller.summary)

router.post('/', customer, controller.create)
router.get('/:id', authorize(ROLES.CUSTOMER, ROLES.PROVIDER), controller.detail)
router.get('/:id/attachments/:attachmentId', authorize(ROLES.CUSTOMER, ROLES.PROVIDER), controller.attachment)
router.post('/:id/attachments', customer, singleFile, controller.addAttachment)
router.post('/:id/cancel', customer, controller.cancel)

router.post('/:id/accept', provider, controller.accept)
router.post('/:id/decline', provider, controller.decline)
router.post('/:id/start', provider, controller.start)
router.post('/:id/complete', provider, controller.complete)

export default router