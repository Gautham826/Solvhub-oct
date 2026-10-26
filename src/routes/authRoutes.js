import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.post('/register/customer', authController.registerCustomer)
router.post('/register/provider', authController.registerProvider)
router.post('/login', authController.login)
router.get('/me', authenticate, authController.me)

export default router