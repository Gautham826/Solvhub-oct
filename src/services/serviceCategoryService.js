import prisma from '../config/prisma.js'

export function listActiveCategories() {
  return prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, description: true, icon: true, group: true },
  })
}