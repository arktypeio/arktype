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
