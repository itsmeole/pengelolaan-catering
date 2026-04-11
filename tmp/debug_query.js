
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugOrderQuery() {
  const { data, error } = await supabase
    .from('Order')
    .select(`
        *,
        items:"OrderItem"(*, menu:"MenuItem"(imageUrl, name))
    `)
    .limit(1);

  if (error) {
    console.error('QUERY ERROR:', error);
  } else {
    console.log('QUERY SUCCESS:', data);
  }
}

debugOrderQuery();
