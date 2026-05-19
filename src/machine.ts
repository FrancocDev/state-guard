/**
 * state-guard — Type-safe state machine builder and runtime.
 *
 * Provides a fluent builder chain (`createMachine → .state() → .on() → .build()`)
 * and an immutable `Machine` with compile-time dispatch narrowing.
 *
 * The key mechanic: encode the full transition graph as a type parameter `M`
 * on `Machine<M, C, TC>`, so `dispatch<E>(e)` constrains `E` to the transition
 * table of the current state `C` — invalid events produce compile-time errors.
 *
 * @example
 * ```ts
 * const m = createMachine("idle")
 *   .state("idle").on("START", "loading")
 *   .state("loading").on("COMPLETE", "done").on("FAIL", "error")
 *   .state("done")
 *   .state("error")
 *   .build();
 * ```
 */

// -- Types -------------------------------------------------------------------

/**
 * A record mapping each state name to its transition table.
 *
 * Each key is a state name, and its value is a record of event→target mappings.
 */
export type StateMap = Record<string, Record<string, string>>;

/**
 * Merge additional transitions into a specific state key within a StateMap.
 *
 * Uses intersection to accumulate multiple `.on()` calls on the same state:
 * ```
 * .on("FETCH", "loading")     →  M[Cur] = {} & {FETCH: "loading"}
 * .on("CANCEL", "error")      →  M[Cur] = {FETCH: "loading"} & {CANCEL: "error"}
 * ```
 */
type MergeInto<
  M extends StateMap,
  K extends keyof M,
  V extends Record<string, string>,
> = {
  [P in keyof M]: P extends K ? M[P] & V : M[P];
};

// -- Machine Public Interface -------------------------------------------------

/**
 * A finalized, immutable state machine.
 *
 * @template M — The state map encoding the full transition table
 * @template C — The current state (must be a key of M)
 * @template TC — The machine's shared context type (defaults to `{}`)
 *
 * @example
 * ```ts
 * type M = typeof machine;            // Machine<{idle: {START: "loading"}, …}, "idle">
 * machine.dispatch("START")           // ✅ returns Machine<…, "loading">
 * machine.dispatch("CANCEL")          // ❌ compile-time error
 * ```
 */
export type Machine<M extends StateMap, C extends keyof M, TC = {}> = {
  /** Return the current branded state name. */
  getState(): C;

  /** Return the machine's shared context. */
  getContext(): TC;

  /**
   * Dispatch an event, transitioning the machine.
   *
   * Only accepts events valid from the current state (compile-time checked via
   * `E extends keyof M[C]`). Returns the new machine with the updated state.
   * Returns `false` when a guard blocks the transition.
   * Throws `TypeError` when no transition exists for the event (programming error).
   */
  dispatch<E extends keyof M[C]>(event: E): Machine<M, M[C][E], TC> | false;

  /**
   * Check whether an event can be dispatched from the current state.
   *
   * Acts as a type predicate — when true, the event is narrowed to the valid
   * event union for the current state.
   */
  canDispatch(event: string): event is Extract<keyof M[C], string>;

  /**
   * Check whether the current state matches any of the given states.
   *
   * @param states — One or more states to test against
   */
  matches(...states: C[]): boolean;
};

// -- Runtime Helper Types -----------------------------------------------------

/** Loose guard type for internal storage (concrete typing via createGuard). */
type GuardFn = (params: {
  state: string;
  event: string;
  context: unknown;
}) => boolean;

/** Runtime storage for a single transition. */
type TransitionRecord = {
  target: string;
  guard: GuardFn | undefined;
};

/** Runtime storage for a single state's configuration. */
type StateRecord = {
  transitions: Map<string, TransitionRecord>;
};

// -- MachineBuilder -----------------------------------------------------------

/**
 * Fluent builder for constructing a type-safe state machine.
 *
 * Accumulates the state map `M` through method chaining:
 * 1. `.state(name)` adds a state entry to `M`
 * 2. `.on(event[, guard], target)` adds a transition to the current state
 * 3. `.build(context?)` freezes and returns a `Machine<M, Init, TC>`
 *
 * @template M — Accumulated state map (grows with each `.state()` call)
 * @template Init — The initial state name (set at construction)
 * @template Cur — The current state being defined (set by `.state()`)
 * @template TC — The machine's context type (resolved at `build()`)
 */
export class MachineBuilder<
  M extends StateMap,
  Init extends string,
  Cur extends string = never,
  TC = {},
> {
  private _states = new Map<string, StateRecord>();
  private _currentState = "";
  private _initial: string;

  constructor(initial: Init) {
    this._initial = initial;
  }

  /**
   * Register a state in the machine.
   *
   * Subsequent `.on()` calls will add transitions to this state.
   *
   * @param name — State name (string literal, becomes a branded type)
   * @returns The builder with the new state added to the type map
   */
  state<S extends string>(
    name: S,
  ): MachineBuilder<M & Record<S, {}>, Init, S, TC> {
    if (!this._states.has(name)) {
      this._states.set(name, { transitions: new Map() });
    }
    this._currentState = name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as any;
  }

  /**
   * Add a transition from the current state.
   *
   * Two overloads:
   * - `.on(event, target)` — unconditional transition
   * - `.on(event, guard, target)` — guarded transition
   *
   * @param event — Event name (string literal, becomes a branded type)
   * @param guardOrTarget — Guard function for conditional transitions, or target state
   * @param maybeTarget — Target state (only when guard is provided)
   * @returns The builder with the transition added to the type map
   */
  on<E extends string, T extends string>(
    event: E,
    target: T,
  ): MachineBuilder<
    MergeInto<M, Cur, Record<E, T>>,
    Init,
    Cur,
    TC
  >;
  on<E extends string, T extends string>(
    event: E,
    guard: (params: {
      state: Cur;
      event: E;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: any;
    }) => boolean,
    target: T,
  ): MachineBuilder<
    MergeInto<M, Cur, Record<E, T>>,
    Init,
    Cur,
    TC
  >;
  on<E extends string, T extends string>(
    event: E,
    guardOrTarget:
      | T
      | ((params: { state: Cur; event: E; context: any }) => boolean),
    maybeTarget?: T,
  ): MachineBuilder<
    MergeInto<M, Cur, Record<E, T>>,
    Init,
    Cur,
    TC
  > {
    const guard =
      maybeTarget === undefined
        ? undefined
        : (guardOrTarget as (params: {
            state: Cur;
            event: E;
            context: any;
          }) => boolean);
    const target = (maybeTarget ?? guardOrTarget) as T;

    const stateConfig = this._states.get(this._currentState);
    if (stateConfig) {
      stateConfig.transitions.set(event, {
        target,
        guard: guard as GuardFn | undefined,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as any;
  }

  /**
   * Finalise the builder and produce an immutable Machine.
   *
   * @param context — Optional initial shared context
   * @returns A new Machine instance
   * @throws TypeError if the initial state was never defined via `.state()`
   */
  build<Ctx = TC>(context?: Ctx): Machine<M, Init, Ctx> {
    if (!this._states.has(this._initial)) {
      throw new TypeError(
        `Initial state "${this._initial}" has not been defined. ` +
          `Call .state("${this._initial}") before .build().`,
      );
    }

    return new MachineRuntime<M, Init, Ctx>(
      this._states,
      this._initial as Init,
      (context ?? {}) as Ctx,
    ) as unknown as Machine<M, Init, Ctx>;
  }
}

// -- MachineRuntime (internal implementation) ---------------------------------

class MachineRuntime<M extends StateMap, C extends keyof M, TC>
  implements Machine<M, C, TC>
{
  private _states: Map<string, StateRecord>;
  private _currentState: C;
  private _context: TC;

  constructor(
    states: Map<string, StateRecord>,
    initial: C,
    context: TC,
  ) {
    this._states = states;
    this._currentState = initial;
    this._context = context;
  }

  getState(): C {
    return this._currentState;
  }

  getContext(): TC {
    return this._context;
  }

  dispatch<E extends keyof M[C]>(
    event: E,
  ): Machine<M, M[C][E], TC> | false {
    const stateConfig = this._states.get(this._currentState as string);
    if (!stateConfig) {
      throw new TypeError(
        `State "${String(this._currentState)}" not found in machine definition.`,
      );
    }

    const transition = stateConfig.transitions.get(event as string);
    if (!transition) {
      throw new TypeError(
        `No transition defined for event "${String(event)}" from state "${String(this._currentState)}".`,
      );
    }

    // Run guard if present — reject the transition when it returns false
    if (transition.guard) {
      const ok = transition.guard({
        state: this._currentState as string,
        event: event as string,
        context: this._context as unknown,
      });
      if (!ok) {
        return false;
      }
    }

    const targetState = transition.target as M[C][E];

    return new MachineRuntime<M, typeof targetState, TC>(
      this._states,
      targetState as typeof targetState,
      this._context,
    ) as unknown as Machine<M, M[C][E], TC>;
  }

  canDispatch(event: string): event is Extract<keyof M[C], string> {
    const stateConfig = this._states.get(this._currentState as string);
    if (!stateConfig) return false;
    return stateConfig.transitions.has(event);
  }

  matches(...states: C[]): boolean {
    return states.some((s) => s === this._currentState);
  }
}

// -- Factory ------------------------------------------------------------------

/**
 * Create a new state machine builder.
 *
 * @param initialState — Name of the initial (starting) state
 * @returns A `MachineBuilder` chain
 *
 * @example
 * ```ts
 * const m = createMachine("idle")
 *   .state("idle").on("START", "loading")
 *   .state("loading")
 *   .build();
 * ```
 */
export function createMachine<const Init extends string>(
  initialState: Init,
): MachineBuilder<Record<never, never>, Init, never> {
  return new MachineBuilder<Record<never, never>, Init, never>(
    initialState,
  );
}
