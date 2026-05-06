import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { checkPerIpRate, originAllowed } from "./guard";

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeReq(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

describe("originAllowed", () => {
  it("rejects mismatched origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = makeReq({
      origin: "https://attacker.example",
      host: "tracker.example",
    });
    expect(originAllowed(req)).toBe(false);
  });

  it("accepts same-host origin", () => {
    const req = makeReq({
      origin: "https://tracker.example",
      host: "tracker.example",
    });
    expect(originAllowed(req)).toBe(true);
  });

  it("accepts referer match when origin is missing", () => {
    const req = makeReq({
      referer: "https://tracker.example/ru/players/steam/foo",
      host: "tracker.example",
    });
    expect(originAllowed(req)).toBe(true);
  });

  it("accepts requests with no origin/referer in non-production (dev/curl)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = makeReq({});
    expect(originAllowed(req)).toBe(true);
  });

  it("rejects requests with no origin/referer in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = makeReq({});
    expect(originAllowed(req)).toBe(false);
  });
});

describe("checkPerIpRate", () => {
  it("allows the first request and decrements remaining", () => {
    const req = makeReq({ "x-forwarded-for": "1.2.3.4" });
    const r1 = checkPerIpRate(req);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBeGreaterThanOrEqual(0);
    expect(r1.remaining).toBeLessThanOrEqual(29);
  });

  it("blocks after the per-IP limit is exhausted", () => {
    const ip = `5.6.7.${Math.floor(Math.random() * 254)}`;
    const req = makeReq({ "x-forwarded-for": ip });
    let last: ReturnType<typeof checkPerIpRate> | null = null;
    for (let i = 0; i < 35; i += 1) {
      last = checkPerIpRate(req);
    }
    expect(last?.allowed).toBe(false);
    expect(last?.retryAfter).toBeGreaterThan(0);
  });

  it("treats different IPs independently", () => {
    const ipA = `9.9.9.${Math.floor(Math.random() * 254)}`;
    const ipB = `8.8.8.${Math.floor(Math.random() * 254)}`;
    for (let i = 0; i < 30; i += 1) checkPerIpRate(makeReq({ "x-forwarded-for": ipA }));
    const blocked = checkPerIpRate(makeReq({ "x-forwarded-for": ipA }));
    const fresh = checkPerIpRate(makeReq({ "x-forwarded-for": ipB }));
    expect(blocked.allowed).toBe(false);
    expect(fresh.allowed).toBe(true);
  });
});
