/**
 * Compile-time type tests for state-guard.
 *
 * These tests verify that branded types provide nominal-type
 * isolation at compile time. If any @ts-expect-error line below
 * compiles without error, the brand isolation is broken.
 *
 * Verify with: `tsc --noEmit` (should produce zero errors)
 */

import type { StateName, EventName, TransitionId } from "./types.js";

// ---------------------------------------------------------------------------
// Brand Isolation — cross-assignment must fail at compile time
// ---------------------------------------------------------------------------

// @ts-expect-error — StateName must NOT be assignable to EventName
const _cross_s_to_e: EventName<string> = null as unknown as StateName<string>;

// @ts-expect-error — EventName must NOT be assignable to StateName
const _cross_e_to_s: StateName<string> = null as unknown as EventName<string>;

// @ts-expect-error — StateName must NOT be assignable to TransitionId
const _cross_s_to_t: TransitionId<string> = null as unknown as StateName<string>;

// @ts-expect-error — TransitionId must NOT be assignable to StateName
const _cross_t_to_s: StateName<string> = null as unknown as TransitionId<string>;

// @ts-expect-error — EventName must NOT be assignable to TransitionId
const _cross_e_to_t: TransitionId<string> = null as unknown as EventName<string>;

// @ts-expect-error — TransitionId must NOT be assignable to EventName
const _cross_t_to_e: EventName<string> = null as unknown as TransitionId<string>;

// ---------------------------------------------------------------------------
// Same-brand assignment must succeed
// ---------------------------------------------------------------------------

// StateName to StateName must compile (same literal type)
const _same_s: StateName<"idle"> = null as unknown as StateName<"idle">;

// EventName to EventName must compile (same literal type)
const _same_e: EventName<"FETCH"> = null as unknown as EventName<"FETCH">;

// ---------------------------------------------------------------------------
// GuardContext and Transition structural usage
// ---------------------------------------------------------------------------

import type { GuardContext, Transition } from "./types.js";

// GuardContext wraps context type
const _ctx: GuardContext<{ count: number }> = { context: { count: 42 } };

// Transition targets a state
const _tgt: Transition<"done"> = { target: "done" };

// Ensure branded types are structurally compatible within same brand
const _brand_eq: StateName<"idle"> = null as unknown as StateName<"idle">;
// (same-literal-type assignment already verified by _same_s above)
