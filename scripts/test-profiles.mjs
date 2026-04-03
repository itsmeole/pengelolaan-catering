import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)/)
    if (match) {
        envVars[match[1]] = match[2].replace(/^"|"$/g, '')
    }
})

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'])

async function testProfiles() {
    const { data, error } = await supabase.from('profiles').select('*')
    console.log("Profiles test result:", { data, error })
    
    // Attempt deleting one of the users and recreating
    // Wait, anon key can't execute admin tasks.
}
testProfiles()
