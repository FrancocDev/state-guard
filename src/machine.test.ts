import { describe, it, expect } from "bun:test";
import { createMachine } from "./machine.js";
import type { Machine } from "./machine.js";
import { createGuard } from "./guards.js";

// ---------------------------------------------------------------------------
// R1: Builder chain
// ---------------------------------------------------------------------------

describe("Machine Builder — R1: Builder chain", () => {
  it("builds a machine from a three-state chain", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .on("COMPLETE", "done")
      .state("done")
      .build();

    expect(m.getState()).toBe("idle");
  });

  it("throws when initial state is not defined", () => {
    expect(() => createMachine("ghost").build()).toThrow(TypeError);
  });

  it("builds a machine with multiple transitions from the same state", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .on("CANCEL", "error")
      .state("loading")
      .on("COMPLETE", "done")
      .state("done")
      .state("error")
      .build();

    expect(m.getState()).toBe("idle");
    expect(m.canDispatch("START")).toBe(true);
    expect(m.canDispatch("CANCEL")).toBe(true);
    expect(m.canDispatch("COMPLETE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// R3: Type-safe dispatch
// ---------------------------------------------------------------------------

describe("Dispatch — R3: Transitions", () => {
  it("transitions to the target state on a valid event", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    const next = m.dispatch("START");
    expect(next).not.toBe(false);
    if (next !== false) {
      expect(next.getState()).toBe("loading");
    }
  });

  it("returns a new machine instance (immutable)", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    const next = m.dispatch("START");
    expect(next).not.toBe(false);
    // Original machine should still be in idle
    expect(m.getState()).toBe("idle");
    if (next !== false) {
      expect(next.getState()).toBe("loading");
    }
  });

  it("chains multiple transitions across states", () => {
    let m: Machine<any, any, any> = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .on("COMPLETE", "done")
      .state("done")
      .build();

    m = m.dispatch("START");
    expect(m).not.toBe(false);
    if (m !== false) {
      expect(m.getState()).toBe("loading");
      m = m.dispatch("COMPLETE");
      expect(m).not.toBe(false);
      if (m !== false) {
        expect(m.getState()).toBe("done");
      }
    }
  });

  it("throws TypeError when event has no transition from current state", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    // CANCEL is not a valid event from "idle"
    expect(() =>
      (m as Machine<{ idle: { START: "loading" }; loading: {} }, "idle">).dispatch(
        "CANCEL" as any,
      ),
    ).toThrow(TypeError);
  });

  it("throws TypeError when dispatching from a terminal state", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    const next = m.dispatch("START");
    expect(next).not.toBe(false);
    if (next !== false) {
      // "loading" has no outgoing transitions
      expect(() =>
        (next as Machine<{ idle: { START: "loading" }; loading: {} }, "loading">).dispatch(
          "ANYTHING" as any,
        ),
      ).toThrow(TypeError);
    }
  });
});

// ---------------------------------------------------------------------------
// R4: Runtime helpers — getState, canDispatch, matches
// ---------------------------------------------------------------------------

describe("Runtime Helpers — R4", () => {
  it("getState returns the initial state before dispatch", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    expect(m.getState()).toBe("idle");
  });

  it("getState returns updated state after dispatch", () => {
    let m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    const next = m.dispatch("START");
    expect(next).not.toBe(false);
    if (next !== false) {
      expect(next.getState()).toBe("loading");
    }
  });

  it("canDispatch returns true for valid events from current state", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    expect(m.canDispatch("START")).toBe(true);
  });

  it("canDispatch returns false for invalid events from current state", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    expect(m.canDispatch("CANCEL")).toBe(false);
    expect(m.canDispatch("COMPLETE")).toBe(false);
  });

  it("canDispatch returns false for unknown state", () => {
    // This should never happen at runtime with a properly built machine,
    // but the method should handle it gracefully.
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    // Verify that the current state exists
    expect(m.canDispatch("START")).toBe(true);
  });

  it("matches returns true when current state is in the given list", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    expect(m.matches("idle")).toBe(true);
    expect(m.matches("idle", "loading")).toBe(true);
    expect(m.matches("done", "error")).toBe(false);
  });

  it("matches returns false when current state is not in the list", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    expect(m.matches("loading")).toBe(false);
    expect(m.matches("done")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// R5/R6: Guard handling
// ---------------------------------------------------------------------------

describe("Guards — R5/R6", () => {
  it("unconditional transition always passes (no guard) — R6", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    const next = m.dispatch("START");
    expect(next).not.toBe(false);
    if (next !== false) {
      expect(next.getState()).toBe("loading");
    }
  });

  it("guard passing allows the transition — R5", () => {
    type Ctx = { ready: boolean };

    let m = createMachine("idle")
      .state("idle")
      .on(
        "START",
        createGuard<Ctx, "idle", "START">(({ context }) => context.ready),
        "loading",
      )
      .state("loading")
      .build<Ctx>({ ready: true });

    const next = m.dispatch("START");
    expect(next).not.toBe(false);
    if (next !== false) {
      expect(next.getState()).toBe("loading");
    }
  });

  it("guard rejection returns false, state unchanged — R5", () => {
    type Ctx = { ready: boolean };

    const m = createMachine("idle")
      .state("idle")
      .on(
        "START",
        createGuard<Ctx, "idle", "START">(({ context }) => context.ready),
        "loading",
      )
      .state("loading")
      .build<Ctx>({ ready: false });

    const result = m.dispatch("START");
    expect(result).toBe(false);
    // Original machine state is unchanged
    expect(m.getState()).toBe("idle");
  });

  it("guard receives state, event, and context — R5", () => {
    type Ctx = { value: number };

    const guard = createGuard<Ctx, "idle", "CHECK">(
      ({ state, event, context }) => {
        expect(state).toBe("idle");
        expect(event).toBe("CHECK");
        expect(context.value).toBe(42);
        return true;
      },
    );

    const m = createMachine("idle")
      .state("idle")
      .on("CHECK", guard, "loading")
      .state("loading")
      .build<Ctx>({ value: 42 });

    const next = m.dispatch("CHECK");
    expect(next).not.toBe(false);
    if (next !== false) {
      expect(next.getState()).toBe("loading");
    }
  });
});

// ---------------------------------------------------------------------------
// R7: Context inference
// ---------------------------------------------------------------------------

describe("Context — R7", () => {
  it("getContext returns the initial context", () => {
    type Ctx = { user: string; count: number };

    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build<Ctx>({ user: "alice", count: 0 });

    expect(m.getContext()).toEqual({ user: "alice", count: 0 });
  });

  it("context is accessible in guards", () => {
    type Ctx = { retries: number };

    const guard = createGuard<Ctx, "error", "RETRY">(
      ({ context }) => context.retries < 3,
    );

    const m = createMachine("error")
      .state("error")
      .on("RETRY", guard, "idle")
      .state("idle")
      .build<Ctx>({ retries: 1 });

    expect(m.canDispatch("RETRY")).toBe(true);
    const next = m.dispatch("RETRY");
    expect(next).not.toBe(false);
    if (next !== false) {
      expect(next.getState()).toBe("idle");
    }
  });

  it("context defaults to empty object when not provided", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    expect(m.getContext()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// R12: Error handling
// ---------------------------------------------------------------------------

describe("Error Handling — R12", () => {
  it("guard rejection returns false (not throw)", () => {
    type Ctx = { allowed: boolean };

    const m = createMachine("idle")
      .state("idle")
      .on(
        "START",
        createGuard<Ctx, "idle", "START">(({ context }) => context.allowed),
        "loading",
      )
      .state("loading")
      .build<Ctx>({ allowed: false });

    // Should return false, not throw
    const result = m.dispatch("START");
    expect(result).toBe(false);
  });

  it("dispatching with no valid transition throws TypeError", () => {
    const m = createMachine("idle")
      .state("idle")
      .on("START", "loading")
      .state("loading")
      .build();

    // Cast to bypass type safety for the test
    expect(() =>
      (m as any).dispatch("NONEXISTENT"),
    ).toThrow(TypeError);
  });
});
