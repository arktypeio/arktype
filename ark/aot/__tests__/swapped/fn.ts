import { type } from "arktype"
import { lengthOf } from "./containers.ts"

// a mock can swap it for a TypedFn of other parameters
export const Returned = type([lengthOf.returns, "[]"])
