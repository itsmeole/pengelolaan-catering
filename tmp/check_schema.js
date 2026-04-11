
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Check one item from MenuItem to see keys
  const { data: menu, error: menuErr } = await supabase
    .from('MenuItem')
    .select('*')
    .limit(1);

  if (menuErr) console.error('MenuItem Error:', menuErr);
  else console.log('MenuItem Keys:', Object.keys(menu[0] || {}));

  // Check profiles count by role
  const { data: roles, error: roleErr } = await supabase
    .from('profiles')
    .select('role');
  
  if (roleErr) console.error('Profiles Error:', roleErr);
  else {
    const counts = roles.reduce((acc, curr) => {
      acc[curr.role] = (acc[curr.role] || 0) + 1;
      return acc;
    }, {});
    console.log('Profile Counts:', counts);
  }
}

checkSchema();
