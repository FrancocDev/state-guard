import { describe, it, expect } from "bun:test";
import { createGuard, composeGuards, andGuards, orGuards } from "./guards.js";
import type { Guard, GuardParams } from "./guards.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

type Ctx = { count: number; user: string; role: string };

const idleState = "idle" as const;
const fetchEvent = "FETCH" as const;

// ---------------------------------------------------------------------------
// R5: Guard signature
// ---------------------------------------------------------------------------

describe("Guard — R5: Guard signature", () => {
  it("receives state, event, and context", () => {
    const guard = createGuard<Ctx, "idle", "FETCH">((params) => {
      expect(params.state).toBe("idle");
      expect(params.event).toBe("FETCH");
      expect(params.context).toEqual({ count: 0, user: "", role: "" });
      return true;
    });

    guard({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } });
  });

  it("returns boolean", () => {
    const guard = createGuard<Ctx, "idle", "FETCH">(() => true);
    const result = guard({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } });
    expect(typeof result).toBe("boolean");
  });

  it("has typed context inference", () => {
    const guard = createGuard<Ctx, "idle", "FETCH">(({ context }) => {
      // TypeScript should infer context.count as number
      const _count: number = context.count;
      // TypeScript should infer context.user as string
      const _user: string = context.user;
      return _count > 0 && _user !== "";
    });

    expect(guard({ state: "idle", event: "FETCH", context: { count: 1, user: "alice", role: "admin" } })).toBe(true);
    expect(guard({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "admin" } })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// R5: Guard blocks transition
// ---------------------------------------------------------------------------

describe("Guard — R5: Guard blocks transition", () => {
  it("allows transition when guard returns true", () => {
    const guard = createGuard<Ctx, "idle", "FETCH">(
      ({ context }) => context.count === 0,
    );

    const canTransition = guard({
      state: "idle",
      event: "FETCH",
      context: { count: 0, user: "", role: "" },
    });

    expect(canTransition).toBe(true);
  });

  it("blocks transition when guard returns false", () => {
    const guard = createGuard<Ctx, "idle", "FETCH">(
      ({ context }) => context.count === 0,
    );

    const canTransition = guard({
      state: "idle",
      event: "FETCH",
      context: { count: 1, user: "", role: "" },
    });

    expect(canTransition).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createGuard factory
// ---------------------------------------------------------------------------

describe("createGuard", () => {
  it("returns the same function reference", () => {
    const fn = () => true;
    const guard = createGuard(fn);
    expect(guard).toBe(fn);
  });

  it("preserves function behavior", () => {
    const guard = createGuard<Ctx, "idle", "FETCH">(() => true);
    expect(
      guard({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(true);

    const failGuard = createGuard<Ctx, "idle", "FETCH">(() => false);
    expect(
      failGuard({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// composeGuards — R6: Guard composition
// ---------------------------------------------------------------------------

describe("composeGuards", () => {
  it("passes when all guards pass (AND)", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => true);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => true);

    const composed = composeGuards(g1, g2);
    expect(
      composed({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(true);
  });

  it("fails when any guard fails", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => true);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => false);

    const composed = composeGuards(g1, g2);
    expect(
      composed({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(false);
  });

  it("fails on the first failing guard (short-circuit)", () => {
    let secondCalled = false;

    const g1 = createGuard<Ctx, "idle", "FETCH">(() => false);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => {
      secondCalled = true;
      return true;
    });

    const composed = composeGuards(g1, g2);
    expect(
      composed({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(false);
    expect(secondCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// andGuards / orGuards — composition via @francocdev/ts-patterns/guards
// ---------------------------------------------------------------------------

describe("andGuards", () => {
  it("passes when both guards pass", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => true);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => true);

    const combined = andGuards(g1, g2);
    expect(
      combined({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(true);
  });

  it("fails when one guard fails", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => true);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => false);

    const combined = andGuards(g1, g2);
    expect(
      combined({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(false);
  });

  it("fails when both guards fail", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => false);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => false);

    const combined = andGuards(g1, g2);
    expect(
      combined({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(false);
  });
});

describe("orGuards", () => {
  it("passes when both guards pass", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => true);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => true);

    const combined = orGuards(g1, g2);
    expect(
      combined({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(true);
  });

  it("passes when one guard passes", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => false);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => true);

    const combined = orGuards(g1, g2);
    expect(
      combined({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(true);
  });

  it("fails when both guards fail", () => {
    const g1 = createGuard<Ctx, "idle", "FETCH">(() => false);
    const g2 = createGuard<Ctx, "idle", "FETCH">(() => false);

    const combined = orGuards(g1, g2);
    expect(
      combined({ state: "idle", event: "FETCH", context: { count: 0, user: "", role: "" } }),
    ).toBe(false);
  });
});
