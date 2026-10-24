import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("allows our own pages", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("/thesis-builder?design=abc")).toBe("/thesis-builder?design=abc");
  });
  it("blocks other sites and tricks", () => {
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "/account@evil.test", "javascript:alert(1)", "/../x"]) {
      expect(safeNext(bad)).toBe("/account");
    }
  });
});
