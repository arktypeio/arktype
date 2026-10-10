import { type } from "arktype"
import { isTruthy } from "./predicates.ts"

// a Module holds what its definitions reduce to, so its factory checks the dropped narrow is a function too
export const Reduced = type.module({
	a: [
		{ "[string]": "number < 0" },
		"&",
		{ "[string]": ["string", ":", isTruthy] }
	],
	b: "string"
})
