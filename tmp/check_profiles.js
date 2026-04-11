
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, nis, class')
    .order('role', { ascending: true })

  if (error) {
    console.error('Error fetching profiles:', error)
    return
  }

  console.log('--- Current Profiles ---')
  console.table(data)
}

checkProfiles()
