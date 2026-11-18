import { thunkedString } from "./containers.ts"

// a mock can swap it for a Scope whose thunk returns another Type
export const Thunked = thunkedString.type({ a: "c" })
