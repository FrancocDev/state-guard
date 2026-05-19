# state-guard

> **Type-safe state machine library** — branded states, compile-time dispatch safety, typed guards with context inference. Zero runtime dependencies beyond `@francocdev/ts-patterns`.

```ts
import { createMachine } from "@francocdev/state-guard";
import { match } from "@francocdev/ts-patterns/match";

const machine = createMachine("idle")
  .state("idle").on("FETCH", "loading")
  .state("loading").on("SUCCESS", "done").on("FAIL", "error")
  .state("done")
  .state("error")
  .build();

let m = machine.dispatch("FETCH"); // ✅ narrowed to state "loading"

const result = match(m.getState(), {
  idle: ()    => "starting…",
  loading: () => "fetching…",
  done: ()    => "complete!",
  error: ()   => "failed!",
});
// result is `string` — all branches handled (compile-time exhaustiveness)
```

## Install

```bash
bun add @francocdev/state-guard
```

Requires `@francocdev/ts-patterns` as a peer dependency (provides branded types and `match`).

## Why?

State machines are the clearest way to model stateful logic, but most JS/TS implementations sacrifice type safety for flexibility. `state-guard` encodes the entire transition graph at the type level, giving you:

- **Compile-time dispatch safety** — dispatching an invalid event from a state is a type error.
- **Typed guards** — guards receive the exact state, event, and context types.
- **Exhaustive matching** — every state branch is checked at compile time via `match()`.
- **Zero runtime overhead** — brands are erased at runtime; all safety is in the type system.

## Usage

### 1. Basic state machine

```ts
import { createMachine } from "@francocdev/state-guard";

const machine = createMachine("idle")
  .state("idle")       .on("START", "loading")
  .state("loading")    .on("COMPLETE", "done")
  .state("done")
  .build();

console.log(machine.getState()); // "idle" (branded)

const next = machine.dispatch("START");
// typeof next → Machine<{idle: {START: "loading"}, loading: {COMPLETE: "done"}, done: {}}, "loading">

console.log(next !== false ? next.getState() : "blocked"); // "loading"
```

### 2. Guarded transitions

Guards are predicates that receive `{ state, event, context }`. Returning `false` blocks the transition.

```ts
import { createMachine } from "@francocdev/state-guard";
import { createGuard } from "@francocdev/state-guard/guards";

type Ctx = { user: string; isAdmin: boolean };

const machine = createMachine("idle")
  .state("idle")
  .on(
    "DELETE",
    createGuard<Ctx, "idle", "DELETE">(
      ({ context }) => context.isAdmin && context.user !== "",
    ),
    "deleting",
  )
  .state("deleting").on("DONE", "done")
  .state("done")
  .build<Ctx>({ user: "alice", isAdmin: true });

// ✅ passes — guard returns true
let m = machine.dispatch("DELETE");

// ❌ blocked — guard returns false, dispatch returns false
const blockedMachine = machine.build<Ctx>({ user: "", isAdmin: false });
const result = blockedMachine.dispatch("DELETE"); // false
```

### 3. Pattern matching

Use `match()` from `@francocdev/ts-patterns/match` for exhaustive state handling. Every state must have a handler branch at compile time.

```ts
import { match } from "@francocdev/ts-patterns/match";

type States = "idle" | "loading" | "done" | "error";

function getStatusMessage(machine: Machine</* … */>): string {
  return match<States, string>(machine.getState(), {
    idle:    () => "Waiting for input",
    loading: () => "Processing request…",
    done:    () => "Operation complete",
    error:   () => "Something went wrong",
  });
}
```

Missing a branch? TypeScript tells you at compile time:

```ts
// ❌ TS Error: Type '"error"' is not assignable to type 'never'
match(machine.getState(), {
  idle:    () => "idle",
  loading: () => "loading",
  done:    () => "done",
  // error is missing!
});
```

### 4. Context

Machines carry a shared context object accessible to guards and via `getContext()`.

```ts
type Ctx = { retries: number; maxRetries: number };

const guard = createGuard<Ctx, "error", "RETRY">(
  ({ context }) => context.retries < context.maxRetries,
);

const machine = createMachine("error")
  .state("error").on("RETRY", guard, "loading")
  .state("loading").on("COMPLETE", "done")
  .state("done")
  .build<Ctx>({ retries: 0, maxRetries: 3 });

machine.getContext(); // { retries: 0, maxRetries: 3 }
```

### 5. Runtime helpers

```ts
machine.getState();        // Current branded state
machine.getContext();      // Current context value
machine.canDispatch("X");  // boolean — is "X" valid from current state?
machine.matches("a", "b"); // boolean — is current state "a" or "b"?

// canDispatch is a type predicate — narrows the event type when true
if (machine.canDispatch("RETRY")) {
  machine.dispatch("RETRY"); // ✅ type-safe
}
```

## API Reference

### Top-level (`state-guard`)

| Export | Kind | Description |
|--------|------|-------------|
| `createMachine(initialState)` | Function | Create a new `MachineBuilder` chain |
| `MachineBuilder` | Class | Fluent builder: `.state(name).on(event, target).build()` |
| `Machine<M, C, TC>` | Type | Immutable state machine — dispatch returns narrowed copy |
| `StateMap` | Type | Record of state → transition table |
| `version` | Value | Package version string |

### Types (`state-guard/types`)

| Export | Kind | Description |
|--------|------|-------------|
| `StateName<S>` | Type | Branded string literal for state names |
| `EventName<E>` | Type | Branded string literal for event names |
| `TransitionId<T>` | Type | Branded string literal for transition IDs |
| `GuardContext<C>` | Type | Envelope `{ context: C }` for guard functions |
| `Transition<C>` | Type | Transition target `{ target: C }` |

### Guards (`state-guard/guards`)

| Export | Kind | Description |
|--------|------|-------------|
| `GuardParams<TC, C, E>` | Type | Guard parameters `{ state, event, context }` |
| `Guard<TC, C, E>` | Type | Guard function signature |
| `createGuard(fn)` | Function | Identity factory for typed guard functions |
| `composeGuards(...gs)` | Function | Combine guards with AND logic (short-circuits) |
| `andGuards(a, b)` | Function | Two guards with AND semantics (via `@francocdev/ts-patterns/guards`) |
| `orGuards(a, b)` | Function | Two guards with OR semantics (via `@francocdev/ts-patterns/guards`) |

### Machine methods

| Method | Returns | Description |
|--------|---------|-------------|
| `dispatch(event)` | `Machine \| false` | Transition to next state (or `false` if guard blocks) |
| `getState()` | `C` | Current branded state |
| `getContext()` | `TC` | Current shared context |
| `canDispatch(event)` | `boolean` | Type predicate — is event valid from current state? |
| `matches(...states)` | `boolean` | Is current state one of the given states? |

## Requirements

- **Runtime**: `@francocdev/ts-patterns` — provides branded types and pattern matching
- **TypeScript**: 5.x+ with `strict: true`
- **Module**: ESM only (`type: "module"` in `package.json`)
- **Build**: Bun (package manager and build tool)

## Project Status

**Experimental** — pre-1.0. API may change based on feedback.

## License

MIT
