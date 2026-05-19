/**
 * Guard Functions — transition guards for state-guard state machines.
 *
 * Guards are predicates that receive the current state, event, and
 * machine context, and return `boolean`. Returning `false` blocks
 * the transition.
 *
 * Composition helpers (`composeGuards`) leverage
 * `@francocdev/ts-patterns/guards` for combining guards with AND/OR logic.
 */

import { and, or } from "@francocdev/ts-patterns/guards";
import type { GuardContext } from "./types.js";

// -- Types -------------------------------------------------------------------

/**
 * Parameters passed to a guard function.
 *
 * @template TC — The machine's shared context type
 * @template C — The current state name (string literal)
 * @template E — The event being dispatched (string literal)
 */
export type GuardParams<TC, C extends string, E extends string> = {
  /** The current state of the machine. */
  state: C;
  /** The event being dispatched. */
  event: E;
  /** The machine's shared context. */
  context: TC;
};

/**
 * A guard function type.
 *
 * Returns `true` to allow the transition, `false` to block it.
 *
 * @template TC — The machine's shared context type
 * @template C — The current state name
 * @template E — The event being dispatched
 */
export type Guard<TC, C extends string, E extends string> = (
  params: GuardParams<TC, C, E>,
) => boolean;

// -- Factory -----------------------------------------------------------------

/**
 * Create a typed guard function.
 *
 * The returned guard is identity-wrapped for type safety — the
 * factory itself adds no runtime overhead; it exists to provide
 * a consistent creation pattern and to anchor type inference.
 *
 * @param fn — The guard predicate
 * @returns The same function, typed as `Guard<TC, C, E>`
 *
 * @example
 * ```ts
 * const canFetch = createGuard<{ loaded: boolean }, "idle", "FETCH">(
 *   (ctx) => !ctx.context.loaded
 * );
 * ```
 */
export function createGuard<TC, C extends string, E extends string>(
  fn: Guard<TC, C, E>,
): Guard<TC, C, E> {
  return fn;
}

// -- Composition -------------------------------------------------------------

/**
 * Options for composing guards.
 */
export type ComposeOptions = {
  /** Label for debug/error messages */
  label?: string;
};

/**
 * Compose a single guard from multiple guards using AND logic.
 *
 * The composed guard passes only when ALL guards pass. This is useful
 * for building complex validation rules from simple, reusable guards.
 *
 * Uses `and` from `@francocdev/ts-patterns/guards` internally.
 *
 * @param guards — Two or more guards to compose
 * @returns A guard that passes only when all input guards pass
 *
 * @example
 * ```ts
 * const strict = composeGuards(
 *   createGuard((ctx) => ctx.context.user !== ""),
 *   createGuard((ctx) => ctx.context.role === "admin"),
 * );
 * ```
 */
export function composeGuards<TC, C extends string, E extends string>(
  ...guards: [Guard<TC, C, E>, Guard<TC, C, E>, ...Guard<TC, C, E>[]]
): Guard<TC, C, E> {
  return (params: GuardParams<TC, C, E>): boolean =>
    guards.every((g) => g(params));
}

/**
 * Combine two guards with AND semantics.
 *
 * The resulting guard passes only when BOTH guards pass.
 * Delegates to `and` from `@francocdev/ts-patterns/guards`.
 *
 * @param a — First guard
 * @param b — Second guard
 * @returns A guard combining both with AND logic
 */
export function andGuards<TC, C extends string, E extends string>(
  a: Guard<TC, C, E>,
  b: Guard<TC, C, E>,
): Guard<TC, C, E> {
  return and(a as (x: unknown) => x is unknown, b as (x: unknown) => x is unknown) as Guard<TC, C, E>;
}

/**
 * Combine two guards with OR semantics.
 *
 * The resulting guard passes when EITHER guard passes.
 * Delegates to `or` from `@francocdev/ts-patterns/guards`.
 *
 * @param a — First guard
 * @param b — Second guard
 * @returns A guard combining both with OR logic
 */
export function orGuards<TC, C extends string, E extends string>(
  a: Guard<TC, C, E>,
  b: Guard<TC, C, E>,
): Guard<TC, C, E> {
  return or(a as (x: unknown) => x is unknown, b as (x: unknown) => x is unknown) as Guard<TC, C, E>;
}
