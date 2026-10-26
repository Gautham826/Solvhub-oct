import { env } from './config/env.js'
import app from './app.js'
import prisma, { checkDatabaseConnection } from './config/prisma.js'

const server = app.listen(env.port, (error) => {
  if (error) {
    // Express 5 reports listen errors here instead of throwing.
    console.error(
      error.code === 'EADDRINUSE'
        ? `[server] Port ${env.port} is already in use - another SOLVHub server is still running. Stop it and start again.`
        : error,
    )
    process.exit(1)
  }
  console.log(`[server] SOLVHub API running on http://localhost:${env.port} (${env.nodeEnv})`)
  checkDatabaseConnection()
})

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))