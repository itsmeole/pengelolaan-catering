import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function main() {
  const email = `test_verbose_${Date.now()}@example.com`
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { name: 'Test Verbose', role: 'STUDENT' }
  })
  
  if (error) {
    console.error('Verbose Error:')
    console.error(JSON.stringify(error, null, 2))
  } else {
    console.log('Success!', data)
    await supabase.auth.admin.deleteUser(data.user.id)
  }
}

main().catch(console.error)
