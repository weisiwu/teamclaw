/**
 * Minimal JWT decoder for client-side use only.
 * Does NOT verify signature — verification is done server-side.
 * Use this only to extract claims from a token that was already validated by the backend.
 */

export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.userId || !payload.role) return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}
