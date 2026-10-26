// Streams a private stored file with safe headers (inline preview, no caching, no sniffing).
export function sendStoredFile(res, { path, mimeType, originalName }) {
  const safeName = originalName.replace(/[^\w.\- ]/g, '_')
  res.set({
    'Content-Type': mimeType,
    'Content-Disposition': `inline; filename="${safeName}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.sendFile(path)
}