import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey } from './keys'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey()
  )
}

const supabase = createClient();

export default supabase;
