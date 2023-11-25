import { schema } from "@arktype/schema"
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
	bigint: schema("bigint"),
	boolean: "true|false",
	false: schema.units(false),
	never: schema(),
	null: schema.units(null),
	number: schema("number"),
	object: schema("object"),
	string: schema("string"),
	symbol: schema("symbol"),
	true: schema.units(true),
	unknown: schema({}),
	void: "undefined" as type.cast<void>,
	undefined: schema.units(undefined)
})

export const tsKeywordsModule = tsKeywords.export()
