// Hand-written messages for what real diagnostics don't reach: each rule's
// edges, and ErrorLens's own quirks.
export type SyntheticCase = { name: string; input: string }

export const syntheticCases: SyntheticCase[] = [
	{
		name: "ErrorType with a quoted message",
		input: `Type 'string' is not assignable to type 'ErrorType<"must be a string">'.`
	},
	{
		name: "ErrorType with an unquoted tuple",
		input: `Argument of type '5' is not assignable to parameter of type 'ErrorType<["Invalid argument", expected: string]>'.`
	},
	{
		name: "ErrorType on the first line of a multi-line message falls to the last-line rule",
		input: `Type 'ErrorType<"a">' is not assignable to type 'string'.\n  Type 'x' is not assignable to type 'y'.`
	},
	{
		name: "$& in a group expands to the matched placeholder",
		input: `Type 'string' is not assignable to type 'ErrorType<"costs $& now">'.`
	},
	{
		name: "$$ in a group collapses to one $",
		input: `Type 'string' is not assignable to type 'ErrorType<"$$ref">'.`
	},
	{
		name: "branded ErrorType object",
		input: `Type 'string' is not assignable to type '{ " brand": "ErrorType"; declared: string; inferred: number; }'.`
	},
	{
		name: "completion ending in a hair space",
		input: `Argument of type '"str"' is not assignable to parameter of type '"string\u200A"'.`
	},
	{
		name: "completion ending in two zero-width spaces",
		input: `Argument of type '"str"' is not assignable to parameter of type '"string\u200B\u200B"'.`
	},
	{
		name: "error message ending in a zero-width space",
		input: `Argument of type '"(string"' is not assignable to parameter of type '"Missing )\u200B"'.`
	},
	{
		name: "assignability to a longer literal",
		input: `Type '"abc"' is not assignable to type '"abcdef"'.`
	},
	{
		name: "assignability to a union of completions",
		input: `Argument of type '"str"' is not assignable to parameter of type '"string" | "symbol"'.`
	},
	{
		name: "assignability backreference is case-insensitive",
		input: `Argument of type '"STR"' is not assignable to parameter of type '"string"'.`
	},
	{
		name: "assignability to an unrelated literal passes through",
		input: `Type '"ab"' is not assignable to type '"xyz"'.`
	},
	{
		name: "lowercase message still matches",
		input: `argument of type '"str"' is not assignable to parameter of type '"string"'.`
	},
	{
		name: "multi-line message keeps its last line, indentation included",
		input: `Type '{ a: string; }' is not assignable to type 'User'.\n  Types of property 'a' are incompatible.\n    Type 'string' is not assignable to type 'number'.`
	},
	{
		name: "trailing newline leaves an empty last line",
		input: `Something went wrong.\n`
	},
	{
		name: "CRLF line breaks",
		input: `First line.\r\nSecond line.`
	},
	{
		name: "single-line message passes through",
		input: `Cannot find name 'notDefined'.`
	},
	{
		name: "tab in a message is drawn as a line break",
		input: `Expected\tsomething.`
	},
	{
		name: "message longer than 500 characters is cut",
		input: `Type '${"x".repeat(520)}' is not assignable to type 'number'.`
	},
	{
		name: "empty message",
		input: ``
	}
]
