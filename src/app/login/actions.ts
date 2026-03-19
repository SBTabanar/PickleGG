'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// NOTE: Supabase handles rate limiting on auth endpoints (sign-in, sign-up) by default.
// However, session creation and queue joining operations should have application-level
// rate limiting added before production deployment (e.g., using upstash/ratelimit or
// a middleware-based approach) to prevent abuse.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6
const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 128

function validateAuthInput(formData: FormData): { email: string; password: string } | { error: string } {
  const rawEmail = formData.get('email')
  const rawPassword = formData.get('password')

  if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string') {
    return { error: 'Email and password are required.' }
  }

  const email = rawEmail.trim()
  const password = rawPassword

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    return { error: 'Email address is too long.' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: 'Password is too long.' }
  }

  return { email, password }
}

export async function login(formData: FormData) {
  const validated = validateAuthInput(formData)

  if ('error' in validated) {
    redirect(`/login?error=${encodeURIComponent(validated.error)}`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  })

  if (error) {
    // Log full error server-side only; show generic message to user
    console.error('Login error:', error.message)
    redirect(`/login?error=${encodeURIComponent('Invalid email or password.')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const validated = validateAuthInput(formData)

  if ('error' in validated) {
    redirect(`/login?error=${encodeURIComponent(validated.error)}`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
  })

  if (error) {
    // Log full error server-side only; show generic message to user
    console.error('Signup error:', error.message)
    redirect(`/login?error=${encodeURIComponent('Could not create account. Please try again.')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
