import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/integrations/supabase/server'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const { email, password } = await request.json()
    
    // Use Supabase Admin client for server-side user creation
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User needs to verify email
    })
    
    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      user: data.user
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
