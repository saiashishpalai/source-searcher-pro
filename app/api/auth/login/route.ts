import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // TODO: Get user from database
    // const user = await getUserByEmail(email)
    
    // TODO: Verify password
    // const isValid = await bcrypt.compare(password, user.password)
    
    // Mock implementation for now
    if (email && password) {
      const token = jwt.sign(
        { userId: '1', email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      )
      
      return NextResponse.json({
        success: true,
        token,
        user: { id: '1', email, isVerified: true }
      })
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
