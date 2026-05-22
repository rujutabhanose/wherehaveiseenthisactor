import { NextResponse } from 'next/server';

export function middleware(req) {
  if (req.cookies.get('uid')) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set('uid', crypto.randomUUID(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
    path: '/',
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
