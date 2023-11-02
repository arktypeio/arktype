import { node } from "@arktype/schema"
import { Scope } from "../scope.js"
import type { RootScope, type } from "./ark.js"

export interface InferredTsKeywords {
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
	any: "unknown" as type.cast<any>,
	bigint: node("bigint"),
	boolean: "true|false",
	false: node.units(false),
	never: node(),
	null: node.units(null),
	number: node("number"),
	object: node("object"),
	string: node("string"),
	symbol: node("symbol"),
	true: node.units(true),
	unknown: node({}),
	void: "undefined" as type.cast<void>,
	undefined: node.units(undefined)
})

export const tsKeywordsModule = tsKeywords.export()
