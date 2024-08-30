import { type } from "arktype"

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
	arrayOfObjectLiteral: [
		{
			name: "string"
		},
		"[]"
	],
	tuple: ["number", "number"]
})

// available syntax new to 2.0

export const upcomingTsSyntax = type({
	keyof: "keyof object",
	variadicTuples: ["true", "...", "false[]"],
	arrayOfObjectLiteral: type({ name: "string" }).array()
})

// runtime-specific syntax and builtin keywords with great error messages

export const validationSyntax = type({
	keywords: "string.email | string.uuid | string.creditCard | number.integer", // and many more
	builtinParsers: "string.date.parse", // parses a Date from a string
	nativeRegexLiteral: /@arktype\.io/,
	embeddedRegexLiteral: "string.email & /@arktype\\.io/",
	divisibility: "number % 10", // a multiple of 10
	bound: "string.alpha > 10", // an alpha-only string with more than 10 characters
	range: "1 <= string.email[] < 100", // a list of 1 to 99 emails
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

// type is fully introspectable and traversable
const parseUser = type("string").pipe(s => JSON.parse(s), user)

const maybeMe = parseUser('{ "name": "David" }')

if (maybeMe instanceof type.errors) {
	// "age must be a number (was missing)"
	console.log(maybeMe.summary)
}
