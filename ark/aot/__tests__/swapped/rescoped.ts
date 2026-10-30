import { BigintOfStringF } from "./containers.ts"

// a mock can swap it for an equal Type from a Scope where `f` is another Type
export const Widened = BigintOfStringF.or("f")
