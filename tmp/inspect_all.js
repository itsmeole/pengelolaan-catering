
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
  // Check MenuItem schema
  const { data: menuItems, error } = await supabase.from('MenuItem').select('*').limit(1);
  if (menuItems && menuItems.length > 0) {
    console.log('MenuItem Keys:', Object.keys(menuItems[0]));
  }

  // Check auth users vs profiles
  const { data, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth Error:', authError);
  } else {
    console.log(`Found ${data.users.length} users in Auth.`);
    data.users.forEach(u => {
      console.log(`- ${u.email} | ID: ${u.id} | Name: ${u.user_metadata?.name} | Role: ${u.user_metadata?.role}`);
    });
  }
}

inspectSchema();
