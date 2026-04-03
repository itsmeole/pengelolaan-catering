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

async function testSign() {
    const { data, error } = await supabase.auth.signUp({
        email: `test_${Date.now()}@test.com`,
        password: 'password123',
        options: {
            data: { name: 'Test User', role: 'STUDENT' }
        }
    })
    console.log("Signup:", { data, error })
}
testSign()
