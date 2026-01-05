import { PrismaClient } from '@prisma/client'

// Temporarily override the internal connection URL for testing
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "mysql://root:@localhost:3306/catering_db",
        },
    },
})

async function main() {
    console.log('Testing MySQL Connection with NO PASSWORD...')
    try {
        await prisma.$connect()
        console.log('✅ SUCCESS! Your XAMPP does not have a password.')
        console.log('Use this in your .env:')
        console.log('DATABASE_URL="mysql://root:@localhost:3306/catering_db"')
    } catch (error) {
        console.log('❌ Connection failed with empty password.')
        console.log('This means you likely HAVE a password set, or MySQL is not running.')
        console.log('Error details:', error.message)
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
