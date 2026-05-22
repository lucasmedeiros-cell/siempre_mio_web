import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './database.types'

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url
  }
  return 'https://placeholder.supabase.co'
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
