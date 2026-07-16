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

async function test(name: string, payload: any) {
  const email = `test_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@example.com`
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    ...payload
  })
  
  if (error) {
    console.log(`- ${name}: FAIL. Status: ${error.status}. Msg: ${error.message}. Code: ${error.code}`)
  } else {
    console.log(`- ${name}: SUCCESS. ID: ${data.user?.id}`)
    await supabase.auth.admin.deleteUser(data.user.id)
  }
}

async function main() {
  console.log('Testing different createUser payloads:')
  await test('No Metadata', {})
  await test('Metadata with Name only', { user_metadata: { name: 'Test Name' } })
  await test('Metadata with Name and Role STUDENT', { user_metadata: { name: 'Test Name', role: 'STUDENT' } })
  await test('Metadata with Name and Role VENDOR', { user_metadata: { name: 'Test Name', role: 'VENDOR' } })
  await test('Metadata with Name and Role ADMIN', { user_metadata: { name: 'Test Name', role: 'ADMIN' } })
  await test('Metadata with Name and invalid role', { user_metadata: { name: 'Test Name', role: 'INVALID_ROLE' } })
}

main().catch(console.error)
