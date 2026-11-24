// Definitions with type errors, one per line, compiled to collect the
// diagnostics TypeScript reports for them. Not run.
import { declare, generic, match, scope, type, type Type } from "arktype"

export const unresolvable = type("number | strin")
export const unresolvableInObject = type({ name: "strng" })
export const partialKeyword = type("str")
export const partialSubtype = type("string.emai")
export const emptyCompletion = type("")
export const trailingOperator = type("string |")
export const unclosedGroup = type("(string | number")
export const unexpectedClose = type("string)")
export const badBound = type("boolean > 5")
export const doubleBound = type("number > 5 > 3")
export const badDivisor = type("string % 2")
export const zeroDivisor = type("number % 0")
export const badArray = type("string[")
export const optionalTupleElement = type(["string?", "number"])
export const badTupleOperator = type(["string", "|"])
export const unknownGeneric = type("Recrd<string, number>")
export const badDefault = type({ a: "number = 'five'" })
export const optionalWithDefault = type({ "a?": "number = 5" })
export const nested = type({ a: { b: { c: "strin" } } })
export const badLiteral = type("'unterminated")
export const regexLiteral = type("/unterminated")
export const keyof = type("keyof stirng")
export const chained = type("string").or("numbr")
export const piped = type("string").to("numbr")
export const scoped = scope({ a: "b", b: "strin" }).export()
export const notADefinition = type(5)
export const badGenericArgument = generic(["T", "string"])({ a: "T" })("number")
export const nonObjectMerge = type("string").merge({ a: "string" })
export const badDeclaration = declare<{ a: string }>().type({ a: "number" })
export const badMatchCase = match({
	strin: (s: string) => s,
	default: "assert"
})
export const wrongTypeAnnotation: Type<number> = type("string")
export const wrongObjectAnnotation: Type<{ a: number }> = type({ a: "string" })
