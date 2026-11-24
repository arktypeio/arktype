// @ts-nocheck
// Comments are never highlighted as definitions, inside or outside one.
import { type } from "arktype"

// type("string | number")
/* type({ a: "string | number" }) */
/**
 * @example type("string.email | null")
 */
const User = type({
	// "string | number" in a comment
	name: "string", // type("number")
	/* "number | bigint" */ age: "number"
})

// 	const T = type({
// 		[optional(s)]: "number"
// 	})

// attest(T.internal.indexableExpressions).snap()
