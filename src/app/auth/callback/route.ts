import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Auto-create profile for OAuth users
      const displayName = data.user.user_metadata?.full_name
        || data.user.user_metadata?.name
        || data.user.email?.split('@')[0]
        || 'Player'

      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: displayName,
        games_played: 0,
        wins: 0,
        losses: 0,
      }, { onConflict: 'id' })

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Could not sign in. Please try again.')}`)
}
