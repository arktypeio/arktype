import { type } from "arktype"
import { emptyArray } from "./predicates.ts"

// the default is checked as a thunk before the index reduces it to never
export const Thunked = type({
	a: [[["/^a+$/", "[]"], "[]"], "=", emptyArray],
	"[string]": "string"
})
