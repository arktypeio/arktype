import { generic, type } from "arktype"
import { emptyArray } from "./predicates.ts"

export const Listed = type({
	c: [["string", "[]"], "=", emptyArray],
	a: "string"
})

export const Listing = generic("t")({ a: [["string", "[]"], "=", emptyArray] })
