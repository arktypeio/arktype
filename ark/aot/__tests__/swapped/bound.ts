import { NumberFooBox } from "./containers.ts"

// a mock can swap it for the same Generic bound into a Scope where `foo` is another Type
export const Bound = NumberFooBox("foo")
