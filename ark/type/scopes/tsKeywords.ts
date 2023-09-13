import { builtins, type CastTo, node } from "@arktype/schema"
import { Scope } from "../scope.js"
import type { RootScope } from "./ark.js"

// "bigint": "a bigint",
// "boolean": "a boolean",
// "false": "false",
// "never": "never",
// "null": "null",
// "number": "a number",
// "object": "an object",
// "string": "a string",
// "symbol": "a symbol",
// "true": "true",
// "unknown": "unknown",
// "void": "void",
// "undefined": "undefined"

export type InferredTsKeywords = {
	any: any
	bigint: bigint
	boolean: boolean
	false: false
	never: never
	null: null
	number: number
	object: object
	string: string
	symbol: symbol
	true: true
	unknown: unknown
	void: void
	undefined: undefined
}

export const tsKeywords: RootScope<InferredTsKeywords> = Scope.root({
	any: "unknown" as CastTo<any>,
	bigint: node("bigint"),
	boolean: "true|false",
	false: node({ is: false } as const),
	never: node(),
	null: node({ is: null }),
	number: node("number"),
	object: node("object"),
	string: node("string"),
	symbol: node("symbol"),
	true: node({ is: true } as const),
	unknown: node({}),
	void: "undefined" as CastTo<void>,
	undefined: node({ is: undefined })
})

export const tsKeywordTypes = tsKeywords.export()
