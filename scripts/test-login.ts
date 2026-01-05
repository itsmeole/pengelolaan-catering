import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Testing Database Connection...')

    try {
        const user = await prisma.user.findUnique({
            where: { email: 'admin@school.id' }
        })

        if (!user) {
            console.error('❌ User admin@school.id NOT FOUND in database.')
            return
        }

        console.log('✅ User found:', user.email, user.role)
        console.log('Stored Hash:', user.password)

        const isMatch = await bcrypt.compare('password123', user.password)

        if (isMatch) {
            console.log('✅ Password "password123" MATCHES the stored hash.')
        } else {
            console.error('❌ Password "password123" DOES NOT MATCH the stored hash.')
            const newHash = await bcrypt.hash('password123', 10)
            console.log('Suggested valid hash for "password123":', newHash)
        }

    } catch (error) {
        console.error('❌ Database connection failed:', error)
    }
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
