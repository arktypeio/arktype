// @ts-nocheck
// Objects, tuples and nesting inside definitions, and the TypeScript
// expressions that can sit beside string definitions.
import { scope, type } from "arktype"

const deep = type({
	a: {
		b: {
			c: {
				d: {
					e: {
						f: "string | number"
					}
				}
			}
		}
	}
})

const tuples = type(["string", "number?", "...", "boolean[]"])
const nestedTuples = type([["string", "number"], [{ a: "string" }, "[]"]])
const tupleExpression = type(["string", "|", "number"])
const morphTuple = type(["string", "=>", (s: string) => s.length])
const narrowTuple = type(["number", ":", (n: number) => n > 0])
const objectInTuple = type([{ name: "string", tags: ["string", "[]"] }])

const $ = scope({
	user: {
		name: "string",
		"email?": "string.email",
		friends: "user[]",
		meta: { created: "Date", "tags?": ["string", "[]"] }
	},
	"admin": "user & { role: 'admin' }",
	thunk: () => $.type("user | null"),
	piped: () => $.type("string").pipe(s => "not a definition|string"),
	called: identity("not a definition|string"),
	ternary: flag ? "string" : "number",
	concat: "string" + "|number",
	cast: "string" as const,
	spread: { ...base, extra: "boolean" },
	computed: { [key]: "string" },
	method() {
		return "not a definition|string"
	},
	arrowBlock: () => {
		return "not a definition|string"
	},
	fn: function () {
		return "not a definition|string"
	},
	arrowExpression: async () => "string | number",
	arrowTernary: x => (x ? "not a definition|string" : "string"),
	logical: cond && "string | number",
	negated: !"string | number",
	constructed: new Thing("not a definition|string"),
	number: 5,
	bool: true,
	regexValue: /not|a|definition/
})

const withLeading = type(
	// a comment before the definition
	{
		/* block comment */ a: "string",
		b: "number" // trailing comment
	}
)
