import { type } from "arktype"
import { emptyArray } from "./predicates.ts"

// arktype checks the default is a function of no parameters as it parses it, though the index then reduces the property to `never`
export const Thunked = type({
	a: [[["/^a+$/", "[]"], "[]"], "=", emptyArray],
	"[string]": "string"
})
