import multer from 'multer'
import { env } from '../config/env.js'
import ApiError from '../utils/ApiError.js'

// Keeps the upload in memory (max MAX_UPLOAD_MB) so its content can be checked
// before anything is written to disk.
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1, fields: 5 },
})

// Accepts a single file in the multipart field "file".
export function singleFile(req, res, next) {
  uploader.single('file')(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest(`File is too large. Maximum size is ${env.maxUploadMb} MB.`))
    if (err instanceof multer.MulterError) return next(ApiError.badRequest('Upload one file in the "file" field'))
    return next(err)
  })
}