import * as directory from '../services/providerDirectoryService.js'

export async function search(req, res) {
  res.json({ success: true, data: await directory.searchProviders(req.query) })
}

export async function detail(req, res) {
  res.json({ success: true, data: await directory.getPublicProvider(req.params.id) })
}

export async function photo(req, res) {
  const { path, mimeType } = await directory.getPublicPhoto(req.params.id)
  res.set({ 'Content-Type': mimeType, 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' })
  res.sendFile(path)
}