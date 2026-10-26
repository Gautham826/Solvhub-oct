import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env.js'

const { PrismaClient } = pkg

// Single shared Prisma instance for the whole app (PostgreSQL via the pg driver adapter).
const adapter = new PrismaPg({ connectionString: env.databaseUrl })

const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
})

export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('[database] PostgreSQL connection OK')
    return true
  } catch (error) {
    console.warn(`[database] PostgreSQL not reachable: ${error.message}`)
    return false
  }
}

export default prisma