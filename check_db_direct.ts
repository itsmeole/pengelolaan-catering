import postgres from 'postgres'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const sql = postgres(process.env.DATABASE_URL!)

async function main() {
  try {
    const result = await sql`
      SELECT id, payload, created_at 
      FROM auth.audit_log_entries 
      ORDER BY created_at DESC 
      LIMIT 10;
    `
    console.log('Audit Log Entries:')
    for (const r of result) {
      console.log(`- Created At: ${r.created_at}`)
      console.log(`  Payload:`, JSON.stringify(r.payload, null, 2))
    }
  } catch (err: any) {
    console.error('Error fetching audit logs:', err.message)
  } finally {
    await sql.end()
  }
}

main().catch(console.error)
