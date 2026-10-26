import { Router } from 'express'
import healthRoutes from './healthRoutes.js'
import authRoutes from './authRoutes.js'
import serviceCategoryRoutes from './serviceCategoryRoutes.js'
import adminRoutes from './adminRoutes.js'
import providerRoutes from './providerRoutes.js'
import providerDirectoryRoutes from './providerDirectoryRoutes.js'
import serviceRequestRoutes from './serviceRequestRoutes.js'
import reviewRoutes from './reviewRoutes.js'

// Central API router - each feature mounts its own router here.
const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/service-categories', serviceCategoryRoutes)
router.use('/admin', adminRoutes)
router.use('/provider', providerRoutes)
router.use('/providers', providerDirectoryRoutes)
router.use('/service-requests', serviceRequestRoutes)
router.use('/reviews', reviewRoutes)

export default router