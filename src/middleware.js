import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Check if this is the /account path (App Router version)
  if (pathname === '/account' || pathname.startsWith('/account/')) {
    const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // If not authenticated, redirect to login
    if (!session) {
      const url = new URL('/auth/login', req.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Original middleware code
  // const { host } = new URL(process.env.APP_URL);
  // const url = req.nextUrl.clone();
  // const hostname = req.headers.get('host');
  // const currentHost = hostname.replace(`.${host}`, '');
  // if (pathname.startsWith(`/_sites`)) {
  //   return new Response(null, { status: 404 });
  // }

  // if (!pathname.includes('.') && !pathname.startsWith('/api')) {
  //   if (hostname === host) {
  //     url.pathname = `${pathname}`;
  //   } else {
  //     url.pathname = `/_sites/${currentHost}${pathname}`;
  //   }

  //   return NextResponse.rewrite(url);
  // }
  
  return NextResponse.next();
}

// Configure matcher for middleware
export const config = {
  matcher: [
    '/account/:path*',
    // Add other paths as needed
  ],
};
