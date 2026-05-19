/**
 * state-guard — Type-safe state machine library.
 *
 * Branded types for states, events, and transitions, plus
 * foundational types for guard functions and transitions.
 *
 * All branded types use `@francocdev/ts-patterns/brand` for
 * nominal-type semantics at compile time with zero runtime overhead.
 */

import type { Branded } from "@francocdev/ts-patterns/brand";

// -- Branded Name Types ------------------------------------------------------

/**
 * Branded type for a state name.
 *
 * Wraps a string literal `S` so it cannot be used where an event
 * name or transition id is expected.
 *
 * @example
 * ```ts
 * type Idle = StateName<"idle">;
 * type Loading = StateName<"loading">;
 * ```
 */
export type StateName<S extends string = string> = Branded<S, "StateName">;

/**
 * Branded type for an event name.
 *
 * Wraps a string literal `E` so it cannot be used where a state
 * name or transition id is expected.
 *
 * @example
 * ```ts
 * type Fetch = EventName<"FETCH">;
 * type Cancel = EventName<"CANCEL">;
 * ```
 */
export type EventName<E extends string = string> = Branded<E, "EventName">;

/**
 * Branded type for a transition identifier.
 *
 * Wraps a string literal `T` so it cannot be used where a state
 * or event name is expected.
 *
 * @example
 * ```ts
 * type T1 = TransitionId<"idle->FETCH->loading">;
 * ```
 */
export type TransitionId<T extends string = string> = Branded<T, "TransitionId">;

// -- Guard Context -----------------------------------------------------------

/**
 * Envelope for typed context accessible to guard functions.
 *
 * Guards receive a `GuardContext<C>` wrapped in `GuardParams`,
 * giving them type-safe access to the machine's shared context.
 *
 * @example
 * ```ts
 * type Ctx = GuardContext<{ user: string; retries: number }>;
 * // { context: { user: string; retries: number } }
 * ```
 */
export type GuardContext<C = unknown> = { context: C };

// -- Transition --------------------------------------------------------------

/**
 * A transition targeting a specific state.
 *
 * Used to define the target of a transition in the state machine's
 * transition table. The type parameter `C` is the target state name.
 *
 * @example
 * ```ts
 * type T = Transition<"loading">;
 * // { target: "loading" }
 * ```
 */
export type Transition<C extends string = string> = { target: C };
