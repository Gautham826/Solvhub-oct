import { listActiveCategories } from '../services/serviceCategoryService.js'

export async function listCategories(req, res) {
  const categories = await listActiveCategories()
  res.json({ success: true, data: { categories } })
}