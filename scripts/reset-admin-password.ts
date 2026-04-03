import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@school.id'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        })
        console.log(`Password for ${email} has been reset to ${password}`)
    } catch (e) {
        console.error("User not found or error updating:", e)
        // If not found, create it
        try {
            await prisma.user.create({
                data: {
                    email,
                    name: "Admin Sekolah",
                    password: hashedPassword,
                    role: "ADMIN"
                }
            })
            console.log(`Created new admin user ${email}`)
        } catch (createError) {
            console.error("Failed to create user:", createError)
        }
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
