import { getOverview } from '../services/adminService.js'

export async function overview(req, res) {
  res.json({ success: true, data: await getOverview() })
}