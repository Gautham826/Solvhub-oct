// SOLVHub database seed.
// - Service categories (reference data shown on the Services page and used for search).
// - The first administrator account, created ONLY from SEED_ADMIN_* environment variables.
// Safe to run multiple times.
import prisma from '../src/config/prisma.js'
import { hashPassword } from '../src/utils/password.js'
import { normalizeEmail, normalizePhone, validatePassword } from '../src/utils/validation.js'

const SERVICE_CATEGORIES = [
  {
    slug: 'fan-repair-installation',
    name: 'Fan Repair & Installation',
    description: 'Ceiling, wall and exhaust fan installation, regulator replacement, noise and wobble fixes, and capacitor or motor repair.',
    icon: 'mode_fan',
    group: 'Home Repairs',
  },
  {
    slug: 'wiring-rewiring',
    name: 'Wiring & Rewiring',
    description: 'New wiring, full house rewiring, concealed and surface conduit work, earthing and fault finding.',
    icon: 'cable',
    group: 'Wiring',
  },
  {
    slug: 'switch-socket-repair',
    name: 'Switch & Socket Repair',
    description: 'Replacing burnt switches and sockets, modular switchboard fitting, loose connections and sparking outlets.',
    icon: 'power',
    group: 'Home Repairs',
  },
  {
    slug: 'lighting-solutions',
    name: 'Lighting Solutions',
    description: 'LED panel and tube light fitting, decorative and outdoor lighting, and sensor or dimmer installation.',
    icon: 'lightbulb',
    group: 'Lighting',
  },
  {
    slug: 'appliance-electrical-work',
    name: 'Appliance Electrical Work',
    description: 'Dedicated points and wiring for geysers, air conditioners, water pumps, induction stoves and washing machines.',
    icon: 'kitchen',
    group: 'Appliances',
  },
  {
    slug: 'inverter-ups-installation',
    name: 'Inverter & UPS Installation',
    description: 'Inverter and UPS installation, battery connection, changeover wiring and backup load planning.',
    icon: 'battery_charging_full',
    group: 'Power & Backup',
  },
  {
    slug: 'mcb-distribution-board',
    name: 'MCB & Distribution Board',
    description: 'MCB, RCCB and distribution board installation or upgrade, frequent tripping issues and load balancing.',
    icon: 'electrical_services',
    group: 'Power & Backup',
  },
  {
    slug: 'maintenance-safety-check',
    name: 'Maintenance & Safety Check',
    description: 'Periodic inspection, earthing and leakage tests, overload checks and safety recommendations for homes and shops.',
    icon: 'fact_check',
    group: 'Safety',
  },
]

async function seedServiceCategories() {
  for (const [index, category] of SERVICE_CATEGORIES.entries()) {
    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { ...category, sortOrder: index + 1 },
      create: { ...category, sortOrder: index + 1 },
    })
  }
  console.log(`[seed] ${SERVICE_CATEGORIES.length} service categories upserted`)
}

async function seedAdmin() {
  const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD } = process.env
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    console.log('[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set - skipping admin account')
    return
  }

  const passwordError = validatePassword(SEED_ADMIN_PASSWORD)
  if (passwordError) throw new Error(`[seed] SEED_ADMIN_PASSWORD: ${passwordError}`)

  const email = normalizeEmail(SEED_ADMIN_EMAIL)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`[seed] Admin ${email} already exists - not modified`)
    return
  }

  await prisma.user.create({
    data: {
      fullName: SEED_ADMIN_NAME || 'SOLVHub Administrator',
      email,
      phone: normalizePhone(SEED_ADMIN_PHONE || ''),
      passwordHash: await hashPassword(SEED_ADMIN_PASSWORD),
      role: 'ADMIN',
    },
  })
  console.log(`[seed] Admin account created for ${email}`)
}

try {
  await seedServiceCategories()
  await seedAdmin()
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}