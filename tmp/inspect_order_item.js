
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectOrderItem() {
  const { data, error } = await supabase.from('OrderItem').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('OrderItem Keys:', Object.keys(data[0]));
  }
}

inspectOrderItem();
