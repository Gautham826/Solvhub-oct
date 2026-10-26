import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import ApiError from '../utils/ApiError.js'

// Private file storage on the server's disk. Files are never served statically;
// controllers stream them only after an authorisation check.
// Swapping this module for a cloud provider later does not affect the rest of the app.
const PRIVATE_DIR = path.join(env.uploadDir, 'private')

export async function saveFile(buffer, ext) {
  await fs.mkdir(PRIVATE_DIR, { recursive: true })
  const storedName = `${randomUUID()}.${ext}`
  await fs.writeFile(path.join(PRIVATE_DIR, storedName), buffer, { flag: 'wx' })
  return storedName
}

export async function removeFile(storedName) {
  if (!storedName) return
  await fs.rm(resolvePath(storedName), { force: true })
}

// Returns an absolute path, refusing anything that could escape the storage folder.
export function resolvePath(storedName) {
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(storedName)) throw ApiError.notFound('File not found')
  return path.join(PRIVATE_DIR, storedName)
}

export async function assertFileExists(storedName) {
  try {
    await fs.access(resolvePath(storedName))
  } catch {
    throw ApiError.notFound('The stored file is missing. Please upload it again.')
  }
}