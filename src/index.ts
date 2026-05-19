/**
 * state-guard — Type-safe state machine library.
 *
 * Tree-shakeable ESM modules. Prefer subpath imports for tree-shaking:
 * ```ts
 * import { StateName } from "state-guard/types"
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
