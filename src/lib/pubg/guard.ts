import type { NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const PER_IP_LIMIT = 30;

const hits: Map<string, { count: number; resetAt: number }> = new Map();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return;
  for (const [key, value] of hits) {
    if (value.resetAt <= now) hits.delete(key);
  }
  lastSweep = now;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export function originAllowed(req: NextRequest): boolean {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!origin && !referer) {
    return process.env.NODE_ENV !== "production";
  }

  const candidates: string[] = [];
  if (host) {
    candidates.push(`http://${host}`, `https://${host}`);
  }
  if (allowedOrigin) {
    candidates.push(allowedOrigin);
  }

  const check = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const u = new URL(url);
      const base = `${u.protocol}//${u.host}`;
      return candidates.some((c) => c === base || c.startsWith(base));
    } catch {
      return false;
    }
  };

  return check(origin) || check(referer);
}

export interface RateCheck {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
}

export function checkPerIpRate(req: NextRequest): RateCheck {
  const now = Date.now();
  sweep(now);

  const ip = clientIp(req);
  const entry = hits.get(ip);

  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0, remaining: PER_IP_LIMIT - 1 };
  }

  if (entry.count >= PER_IP_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    retryAfter: 0,
    remaining: PER_IP_LIMIT - entry.count,
  };
}
