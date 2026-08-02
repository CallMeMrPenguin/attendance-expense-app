const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let url = '';
let anonKey = '';
let serviceKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) anonKey = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = trimmed.split('=')[1].trim();
  }
}

console.log('Testing with Anon Key (Browser Client):');
const clientAnon = createClient(url, anonKey);

async function testAnonKey() {
  const metaStr = JSON.stringify({ type: 'expense', kw: 'test_kw', icon: '🛵', note: 'Test Note' });
  const testRecord = {
    id: 'TestCategoryRLS',
    user_id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
    teacher_name: 'Admin',
    category: 'TestCategoryRLS',
    amount: 123000,
    keywords: metaStr,
    updated_at: new Date().toISOString()
  };

  console.log('Attempting upsert via Anon Key...');
  const { data, error } = await clientAnon.from('category_budgets').upsert([testRecord], { onConflict: 'id' }).select('*');
  if (error) {
    console.error('❌ ANON KEY UPSERT ERROR:', error);
  } else {
    console.log('✅ ANON KEY UPSERT SUCCESS:', data);
    // Cleanup
    await clientAnon.from('category_budgets').delete().eq('id', 'TestCategoryRLS');
  }
}

testAnonKey().catch(console.error);
