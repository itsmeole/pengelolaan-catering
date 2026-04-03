import postgres from 'postgres'
import fs from 'fs'

const connectionString = "postgresql://postgres:Leotampan123!@db.ddcmaczslnbrbzmihjpg.supabase.co:5432/postgres"
const sqlClient = postgres(connectionString)

async function run() {
    try {
        const sqlString = fs.readFileSync('database.sql', 'utf8')
        // Split by simple statement blocks or just run raw if driver permits
        // Postgres.js can execute multiple statements in simple query mode if we use sql.unsafe
        await sqlClient.unsafe(sqlString)
        console.log("Database initialized successfully.")
    } catch (e) {
        console.error("Error executing database.sql:", e)
    } finally {
        await sqlClient.end()
    }
}

run()
