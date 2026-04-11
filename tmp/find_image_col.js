
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKeys() {
  const { data, error } = await supabase.from('MenuItem').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('MenuItem Keys:', Object.keys(data[0]));
  } else {
    // If no data, try to get column names via RPC or a fake query
    console.log('No MenuItem data found. Trying another way...');
    const { data: cols, error: colErr } = await supabase.rpc('get_columns', { table_name: 'MenuItem' });
    console.log('Columns:', cols, colErr);
  }
}

checkKeys();
