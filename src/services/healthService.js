export function getHealthStatus() {
  return {
    success: true,
    message: 'SOLVHub backend is running',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  }
}