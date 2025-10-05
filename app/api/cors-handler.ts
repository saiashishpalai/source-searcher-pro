import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com']
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'];

export function handleCORS(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin');
  
  // Check if the origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  return response;
}

export function handleOptionsRequest() {
  return new NextResponse(null, { status: 200 });
}
