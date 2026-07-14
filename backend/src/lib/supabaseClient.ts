import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabseAnonKey = process.env.SUPABASE_ANON_KEY; 
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}

if(!supabseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY in environment variables.');
}
export const supabaseAnon = createClient(supabaseUrl, supabseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
