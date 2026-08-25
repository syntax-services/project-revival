import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function bumpTerms() {
  console.log("Bumping terms version to 3...");
  const { data, error } = await supabase
    .from('system_config')
    .upsert({ key: 'latest_terms_version', value: '3' });
    
  if (error) console.error("Error:", error);
  else console.log("Success! Users will now be forced to accept the new safety terms.");
}

bumpTerms();
