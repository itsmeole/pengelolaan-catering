import postgres from 'postgres'

const connectionString = "postgresql://postgres:Leotampan123!@db.ddcmaczslnbrbzmihjpg.supabase.co:5432/postgres"
const sqlClient = postgres(connectionString)

async function verify() {
    try {
        const columns = await sqlClient.unsafe(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Order';
        `)
        console.log("COLUMNS FOUND:", columns.map(c => c.column_name))
        
        // Ensure necessary columns exist. Add them if missing.
        await sqlClient.unsafe(`
            ALTER TABLE "Order" 
            ADD COLUMN IF NOT EXISTS "cancelReason" TEXT,
            ADD COLUMN IF NOT EXISTS "cancelImage" TEXT,
            ADD COLUMN IF NOT EXISTS "cancelStatus" TEXT DEFAULT 'NONE',
            ADD COLUMN IF NOT EXISTS "isProofInvalid" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
        `)
        console.log("Migration columns ensured.")
    } catch (e) {
        console.error("Verification failed:", e)
    } finally {
        await sqlClient.end()
    }
}

verify()
