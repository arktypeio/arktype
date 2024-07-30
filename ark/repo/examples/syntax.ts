import { type, type Type } from "arktype"
import type { Out } from "../../type/ast.js"

// Syntax carried over from 1.0 + TS
export const currentTsSyntax = type({
	keyword: "null",
	stringLiteral: "'TS'",
	numberLiteral: "5",
	bigintLiteral: "5n",
	union: "string|number",
	intersection: "boolean&true",
	array: "Date[]",
	grouping: "(0|1)[]",
	objectLiteral: {
		nested: "string",
		"optional?": "number"
	},
	tuple: ["number", "number"]
})

// available syntax new to 2.0

export const upcomingTsSyntax = type({
	keyof: "keyof bigint",
	variadicTuples: ["true", "...", "false[]"]
})

// runtime-specific syntax and builtin keywords with great error messages

export const validationSyntax = type({
	keywords: "email|uuid|creditCard|integer", // and many more
	// builtinParsers: "parse.date", // parses a Date from a string
	nativeRegexLiteral: /@arktype\.io/,
	embeddedRegexLiteral: "email&/@arktype\\.io/",
	divisibility: "number%10", // a multiple of 10
	bound: "alpha>10", // an alpha-only string with more than 10 characters
	range: "1<=email[]<100", // a list of 1 to 99 emails
	narrows: ["number", ":", n => n % 2 === 1], // an odd integer
	morphs: ["string", "=>", parseFloat] // validates a string input then parses it to a number
})

// root-level expressions

const intersected = type({ value: "string" }, "&", { format: "'bigint'" })

// chained expressions via .or, .and, .narrow, .pipe and much more
//  (these replace previous helper methods like union and intersection)

const user = type({
	name: "string",
	age: "number"
})

const parseUser = type("string").pipe(s => JSON.parse(s), user)

// type is fully introspectable and traversable, displayed as:
type ParseUser = Type<
	(In: string) => Out<{
		name: string
		age: number
	}>
>

const maybeMe = parseUser('{ "name": "David" }')

if (maybeMe instanceof type.errors) {
	// "age must be a number (was missing)"
	console.log(maybeMe.summary)
}
