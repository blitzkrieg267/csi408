import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware((auth, req) => {
  if (auth.userId) {
    return NextResponse.next();
  }

  // Allow access to /sign-up and /sign-in routes
  if (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname.startsWith('/sign-up')) {
    return NextResponse.next();
  }

  const signInUrl = new URL('/sign-in', req.url);
  signInUrl.searchParams.set('redirect_url', req.url);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).)',
    '/(api|trpc)(.*)',
  ],
};