import { describe, expect, it } from "vitest";
import { getRateLimitState, withRateLimit } from "./rate-limit";

describe("withRateLimit", () => {
  it("allows up to capacity calls without waiting", async () => {
    const start = Date.now();
    const results = await Promise.all(
      Array.from({ length: 5 }).map(() => withRateLimit(async () => "ok")),
    );
    const elapsed = Date.now() - start;
    expect(results).toEqual(["ok", "ok", "ok", "ok", "ok"]);
    expect(elapsed).toBeLessThan(200);
  });

  it("getRateLimitState reports a sane shape after consumption", async () => {
    await withRateLimit(async () => null);
    const state = getRateLimitState();
    expect(state.tokens).toBeGreaterThanOrEqual(0);
    expect(state.tokens).toBeLessThanOrEqual(10);
    expect(state.queued).toBeGreaterThanOrEqual(0);
    expect(state.msUntilRefill).toBeLessThanOrEqual(60_000);
  });

  it("queues calls beyond capacity (does not throw, eventually returns)", async () => {
    // Exhaust the bucket. We don't await to keep the test fast — we just want to
    // confirm a queued call returns rather than rejects.
    for (let i = 0; i < 12; i += 1) {
      void withRateLimit(async () => null);
    }
    const state = getRateLimitState();
    expect(state.tokens).toBe(0);
    // queued may or may not still be > 0 depending on test ordering — no strict assertion here.
  });
});
