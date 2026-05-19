/**
 * state-guard — Type-safe state machine library.
 *
 * Tree-shakeable ESM modules. Prefer subpath imports for tree-shaking:
 * ```ts
 * import { StateName } from "@francocdev/state-guard/types"
 * import { createGuard } from "@francocdev/state-guard/guards"
 * ```
 */

/** Package version. */
export const version = "0.1.0";

// Types
export type {
  StateName,
  EventName,
  TransitionId,
  GuardContext,
  Transition,
} from "./types.js";

// Guards
export type { GuardParams, Guard } from "./guards.js";
export { createGuard, composeGuards, andGuards, orGuards } from "./guards.js";

// Machine
export type { StateMap, Machine } from "./machine.js";
export { createMachine, MachineBuilder } from "./machine.js";
