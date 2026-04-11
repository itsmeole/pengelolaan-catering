
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, nis, class');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('--- Current Profiles ---');
  data.forEach(p => {
    console.log(`${p.id} | ${p.role} | ${p.name} | ${p.email} | NIS: ${p.nis}`);
  });
}

checkProfiles();
