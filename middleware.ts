import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/',
  '/api/validate-figma',
  '/api/visual-compare',
  '/api/parse-figma-url'
])

export default clerkMiddleware(async (auth, request) => {
  // Allow public routes to proceed without authentication
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }
  
  // For protected routes, redirect to sign-in if not authenticated
  const { userId } = await auth()
  if (!userId) {
    return Response.redirect(new URL('/sign-in', request.url))
  }
  
  // For authenticated users, allow the request to proceed
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 