import type { CastTo } from "@arktype/schema"
import { predicate, union } from "@arktype/schema"
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
	bigint: predicate({ basis: "bigint" }),
	boolean: "true|false",
	false: predicate({ basis: { is: false } }),
	never: union(),
	null: predicate({ basis: { is: null } }),
	number: predicate({ basis: "number" }),
	object: predicate({ basis: "object" }),
	string: predicate({ basis: "string" }),
	symbol: predicate({ basis: "symbol" }),
	true: predicate({ basis: { is: true } }),
	unknown: predicate({}),
	void: "undefined" as CastTo<void>,
	undefined: predicate({ basis: { is: undefined } })
})

export const tsKeywordTypes = tsKeywords.export()
