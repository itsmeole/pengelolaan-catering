import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const password = await bcrypt.hash('password123', 10)

    // Create Admin
    await prisma.user.upsert({
        where: { email: 'admin@school.id' },
        update: {},
        create: {
            email: 'admin@school.id',
            name: 'Admin Sekolah',
            password,
            role: 'ADMIN',
        },
    })

    // Create Vendor
    await prisma.user.upsert({
        where: { email: 'vendor1@catering.id' },
        update: {},
        create: {
            email: 'vendor1@catering.id',
            name: 'Dapur Bunda',
            vendorName: 'Dapur Bunda',
            password,
            role: 'VENDOR',
        },
    })

    await prisma.user.upsert({
        where: { email: 'vendor2@catering.id' },
        update: {},
        create: {
            email: 'vendor2@catering.id',
            name: 'Soto Seger',
            vendorName: 'Soto Seger',
            password,
            role: 'VENDOR',
        },
    })

    // Create Student Validation Data (Whitelist)
    await prisma.studentValidation.createMany({
        data: [
            { nis: '12345', name: 'Budi Santoso', class: 'XII RPL 1' },
            { nis: '12346', name: 'Siti Aminah', class: 'XII RPL 2' },
            { nis: '12347', name: 'Ahmad Dani', class: 'XI TKJ 1' },
        ],
        skipDuplicates: true,
    })

    const vendor1 = await prisma.user.findUnique({ where: { email: 'vendor1@catering.id' } })

    if (vendor1) {
        await prisma.menuItem.createMany({
            data: [
                { vendorId: vendor1.id, name: 'Paket Ayam Bakar', description: 'Nasi, Ayam Bakar, Lalapan, Sambal', price: 15000 },
                { vendorId: vendor1.id, name: 'Paket Lele Goreng', description: 'Nasi, Lele, Lalapan', price: 12000 },
            ]
        })
    }

    console.log('Seeding completed.')
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
