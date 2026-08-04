const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envText.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && !key) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from('category_budgets').select('*').limit(5);
  if (error) {
    console.error('Error fetching category_budgets:', error);
  } else {
    console.log('category_budgets sample rows:');
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
