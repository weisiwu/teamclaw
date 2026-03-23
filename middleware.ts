import { NextRequest, NextResponse } from "next/server";

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
  "X-Frame-Options": "SAMEORIGIN",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // XSS filter (legacy browsers)
  "X-XSS-Protection": "1; mode=block",

  // Content Security Policy — restrict script/style sources to self + inline for Next.js
  // Developers should tighten this further per-page as needed
  "Content-Security-Policy": [
    "default-src 'self'",
    // Next.js needs 'unsafe-inline' for its style injection; keep it as narrow as possible
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),

  // Enforce HTTPS for 1 year, include subdomains, and enforce in browser
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  // Control referrer header sent to third parties
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Restrict Adobe Flash/Acrobat from loading
  "X-Permitted-Cross-Domain-Policies": "none",

  // Permissions Policy — disable unnecessary browser features
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
  ].join(", "),
} as const;

export function middleware(request: NextRequest): NextResponse {
  // Only apply headers to response; pass through without modification
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add request ID to response header for traceability
  const requestId = request.headers.get("X-Request-ID");
  if (requestId) {
    response.headers.set("X-Request-ID", requestId);
  }

  return response;
}

export const config = {
  // Apply to all routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
