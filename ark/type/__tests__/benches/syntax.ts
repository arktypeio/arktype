import { type } from "arktype"

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

// these features will be available in the upcoming release

export const upcomingTsSyntax = type({
	keyof: "keyof bigint",
	thisKeyword: "this", // recurses to the root of the current type
	variadicTuples: ["true", "...false[]"]
})

export const validationSyntax = type({
	keywords: "email|uuid|creditCard|integer", // and many more
	builtinParsers: "parse.date", // parses a Date from a string
	nativeRegexLiteral: /@arktype\.io/,
	embeddedRegexLiteral: "email&/@arktype\\.io/",
	divisibility: "number%10", // a multiple of 10
	bound: "alpha>10", // an alpha-only string with more than 10 characters
	range: "1<=email[]<100", // a list of 1 to 99 emails
	narrows: ["number", ":", (n) => n % 2 === 1], // an odd integer
	morphs: ["string", "=>", parseFloat] // validates a string input then parses it to a number
})

// in the upcoming release, you can use chaining to define expressions directly
// that use objects or functions that can't be embedded in strings

export const parseBigintLiteral = type({ value: "string" })
	.and({
		format: "'bigint'"
	})
	.narrow((data): data is { value: `${string}n`; format: "bigint" } =>
		data.value.endsWith("n")
	)
	.morph((data) => BigInt(data.value.slice(-1)))

export const { data, problems } = parseBigintLiteral("999n")
//             ^?
