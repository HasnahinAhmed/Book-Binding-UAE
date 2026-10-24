import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { BodyTooLargeError, clientIp, isSameOrigin, readBodyLimited } from "./request";

describe("rate limiter", () => {
  it("blocks after the limit and resets after the window", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(true);
    const third = rl.check("a");
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBe(1);
    expect(rl.check("b").ok).toBe(true);
    t = 1000;
    expect(rl.check("a").ok).toBe(true);
  });
  it("keeps memory bounded", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1e9, maxKeys: 3 });
    for (let i = 0; i < 100; i++) rl.check(`k${i}`);
    expect(rl.check("k99").ok).toBe(false);
  });
});

const req = (headers: Record<string, string>, body?: BodyInit) =>
  new Request("http://shop.test/api/x", { method: "POST", headers, body });

describe("request helpers", () => {
  it("accepts same-origin and rejects cross-site posts", () => {
    expect(isSameOrigin(req({ host: "shop.test", origin: "http://shop.test" }))).toBe(true);
    expect(isSameOrigin(req({ host: "shop.test", origin: "https://evil.test" }))).toBe(false);
    expect(isSameOrigin(req({ host: "shop.test", "sec-fetch-site": "cross-site" }))).toBe(false);
  });
  it("only trusts X-Forwarded-For when told to", () => {
    const r = req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(clientIp(r, false)).toBe("local");
    expect(clientIp(r, true)).toBe("1.2.3.4");
  });
  it("stops reading a body that is too large", async () => {
    await expect(readBodyLimited(req({}, "x".repeat(100)), 10)).rejects.toBeInstanceOf(BodyTooLargeError);
    expect((await readBodyLimited(req({}, "hello"), 10)).byteLength).toBe(5);
  });
});
