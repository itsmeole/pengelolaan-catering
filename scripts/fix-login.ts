import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Repairing Admin Account...')

    const password = await bcrypt.hash('password123', 10)

    // 1. Fix Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@school.id' },
        update: {
            password: password,
            role: 'ADMIN'
        },
        create: {
            email: 'admin@school.id',
            name: 'Admin Sekolah',
            password: password,
            role: 'ADMIN',
        },
    })
    console.log('✅ Admin Account Fixed: admin@school.id / password123')

    // 2. Fix Vendor
    await prisma.user.upsert({
        where: { email: 'vendor1@catering.id' },
        update: { password: password, role: 'VENDOR' },
        create: {
            email: 'vendor1@catering.id',
            name: 'Dapur Bunda',
            vendorName: 'Dapur Bunda',
            password: password,
            role: 'VENDOR',
        },
    })
    console.log('✅ Vendor Account Fixed: vendor1@catering.id / password123')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
