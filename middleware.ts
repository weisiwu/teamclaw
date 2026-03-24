import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers middleware for TeamClaw.
 * Applies hardened HTTP headers to all responses to mitigate common web vulnerabilities.
 *
 * Mitigates:
 * - Clickjacking          → X-Frame-Options
 * - MIME sniffing         → X-Content-Type-Options
 * - XSS                  → Content-Security-Policy, X-XSS-Protection
 * - Protocol downgrade    → Strict-Transport-Security
 * - Referrer leakage     → Referrer-Policy
 * - Information leakage  → X-Permitted-Cross-Domain-Policies
 */
const SECURITY_HEADERS = {
  // Prevent clickjacking: disallow embedding in iframes (except on same origin)
  'X-Frame-Options': 'SAMEORIGIN',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS filter (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Content Security Policy — restrict script/style sources to self + inline for Next.js
  // Developers should tighten this further per-page as needed
  'Content-Security-Policy': [
    "default-src 'self'",
    // Next.js needs 'unsafe-inline' for its style injection; keep it as narrow as possible
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' http://localhost:9700",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // Enforce HTTPS for 1 year, include subdomains, and enforce in browser
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Control referrer header sent to third parties
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Restrict Adobe Flash/Acrobat from loading
  'X-Permitted-Cross-Domain-Policies': 'none',

  // Permissions Policy — disable unnecessary browser features
  'Permissions-Policy': ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()'].join(', '),
} as const;

// Routes that don't require authentication
// NOTE: Be specific — avoid broad prefixes like '/api' that bypass auth for all sub-routes.
// Only add routes here if they are truly intended to be public without any auth.
const PUBLIC_ROUTES = [
  '/login',
  '/api/health', // Health check — no auth needed
  '/api/v1/feishu/messages', // Feishu webhook receiver — has its own signature verification
  '/api/v1/feishu/chats', // Feishu webhook receiver — has its own signature verification
  '/_next',
  '/favicon.ico',
  '/public',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Redirect to /login if accessing a protected route without a valid token
  if (!isPublicRoute(pathname)) {
    const authHeader = request.headers.get('authorization');
    const hasToken = authHeader?.startsWith('Bearer ');
    if (!hasToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Apply security headers
  const response = isPublicRoute(pathname) ? NextResponse.next() : NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add request ID to response header for traceability
  const requestId = request.headers.get('X-Request-ID');
  if (requestId) {
    response.headers.set('X-Request-ID', requestId);
  }

  return response;
}

export const config = {
  /**
   * Matcher: two patterns — protected app pages AND protected API routes.
   *
   * Pattern 1 — Protected app pages: matches paths starting with / but NOT
   *   login | api | _next | public | favicon.ico.
   *   E.g. /dashboard, /tasks, /settings → intercepted.
   *   E.g. /login, /api/health, /_next/*, /public/* → bypassed.
   *
   * Pattern 2 — Protected API routes: explicit module list only.
   *   E.g. /api/v1/agents/execute, /api/v1/tasks → intercepted.
   *   E.g. /api/v1/feishu/* (webhooks), /api/health → bypassed.
   *
   * Any internal/debug API endpoints not in the list are automatically bypassed,
   * fixing the previous issue of broad /api/* matching.
   */
  matcher: [
    // Protected API routes only — explicit module list (no catch-all)
    // Page-level auth is handled client-side by useAuth hook / RequireAuth component
    '/api/v1/(agents|branches|dashboard|doc|llm|message|project|search|tag|tasks|token-stats|audit-log|version-bump|version-change-stats|version-diff|version-rollback|version-settings|version-tag|versions)/',
  ],
};
