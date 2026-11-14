import { thunksReturningX } from "./containers.ts"

// a mock can swap it for a Scope whose thunks return other Types, which these sites don't hold
export const Flattened = thunksReturningX.type("t | bigint")
export const Intersected = thunksReturningX.type(["k", "&", { z: "string" }])
export const Keyed = thunksReturningX.type("keyof k")
export const Instantiated = thunksReturningX.type("G<f>")
