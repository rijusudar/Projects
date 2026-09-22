import crypto from 'node:crypto';

interface TokenRecord {
  token: string;
  clientId: string;
  expiresAt: number;
}

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Minimal bearer-token auth. RuView ships with none; this is the gateway's guard so the
 * mobile app never reaches an unauthenticated sensing feed. LAN-first: a single pre-shared
 * secret is exchanged for an opaque token. TLS is the deployer's responsibility across
 * untrusted networks (documented in the README).
 */
export class AuthService {
  private tokens = new Map<string, TokenRecord>();

  constructor(private readonly sharedSecret: string) {}

  issue(clientId: string, secret: string): { token: string; expiresAt: number } | undefined {
    if (!safeEqual(secret, this.sharedSecret)) return undefined;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    this.tokens.set(token, { token, clientId, expiresAt });
    return { token, expiresAt };
  }

  verify(token: string | undefined): boolean {
    if (!token) return false;
    const rec = this.tokens.get(token);
    if (!rec) return false;
    if (rec.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return false;
    }
    return true;
  }

  /** Extract a bearer token from an Authorization header value. */
  static bearer(header: string | undefined): string | undefined {
    if (!header) return undefined;
    const m = /^Bearer\s+(.+)$/i.exec(header.trim());
    return m ? m[1] : undefined;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
