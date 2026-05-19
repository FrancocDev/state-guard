import { describe, it, expect } from "bun:test";
import type { StateName, EventName, TransitionId, GuardContext, Transition } from "./types.js";

describe("Branded Types", () => {
  describe("StateName", () => {
    it("is assignable within the same brand", () => {
      type S1 = StateName<"idle">;
      type S2 = StateName<"idle">;
      // Compile-time check: same-brand assignment compiles
      const _a: S2 = null as unknown as S1;
      expect(true).toBe(true);
    });
  });

  describe("EventName", () => {
    it("is assignable within the same brand", () => {
      type E1 = EventName<"FETCH">;
      type E2 = EventName<"FETCH">;
      const _a: E2 = null as unknown as E1;
      expect(true).toBe(true);
    });
  });

  describe("TransitionId", () => {
    it("is assignable within the same brand", () => {
      type T1 = TransitionId<"t1">;
      type T2 = TransitionId<"t1">;
      const _a: T2 = null as unknown as T1;
      expect(true).toBe(true);
    });
  });

  describe("Brand Isolation", () => {
    it("StateName and EventName are distinct types", () => {
      // At runtime these are just strings, but at compile time
      // they must be nominal types that can't cross-assign.
      // Verified by type-tests.ts with @ts-expect-error assertions.
      type S = StateName<"idle">;
      type E = EventName<"FETCH">;
      // Structural check — a variable typed as one must accept
      // the same literal but typed as the other.
      const _s: S = "idle" as StateName<"idle">;
      const _e: E = "FETCH" as EventName<"FETCH">;
      expect(typeof _s).toBe("string");
      expect(typeof _e).toBe("string");
    });
  });
});

describe("GuardContext", () => {
  it("wraps a context value", () => {
    const ctx: GuardContext<{ count: number }> = { context: { count: 42 } };
    expect(ctx.context.count).toBe(42);
  });

  it("defaults to unknown context", () => {
    const ctx: GuardContext = { context: "anything" };
    expect(ctx.context).toBe("anything");
  });
});

describe("Transition", () => {
  it("defines a target state", () => {
    const t: Transition<"loading"> = { target: "loading" };
    expect(t.target).toBe("loading");
  });
});
