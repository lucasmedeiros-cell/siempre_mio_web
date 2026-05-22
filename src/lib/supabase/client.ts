import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url
  }
  return 'https://placeholder.supabase.co'
}

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  )
}
