import { Router } from 'express'
import { listCategories } from '../controllers/serviceCategoryController.js'

const router = Router()

router.get('/', listCategories)

export default router