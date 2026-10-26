// Detects the real file type from its first bytes ("magic numbers") so a renamed
// file (e.g. script.exe -> photo.jpg) is rejected even if the browser's MIME type lies.
const SIGNATURES = [
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: 'png',
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
]

export function detectFileType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null
  return SIGNATURES.find((s) => s.test(buffer)) || null
}