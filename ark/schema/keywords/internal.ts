import type { Key } from "@arktype/util"
import type { SchemaModule } from "../module.js"
import { root, schemaScope } from "../scope.js"

export namespace internalKeywords {
	export interface exports {
		lengthBoundable: string | unknown[]
		propertyKey: Key
	}
}

export type internalKeywords = SchemaModule<internalKeywords.exports>

export const internalKeywords: internalKeywords = schemaScope(
	{
		lengthBoundable: ["string", Array],
		propertyKey: ["string", "symbol"]
	},
	{
		prereducedAliases: true,
		registerKeywords: true
	}
).export()

// reduce union of all possible values reduces to unknown
root.node(
	"union",
	{
		branches: [
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ unit: true },
			{ unit: false },
			{ unit: null },
			{ unit: undefined }
		]
	},
	{ reduceTo: root.node("intersection", {}, { prereduced: true }) }
)
