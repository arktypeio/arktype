import type { Key } from "@arktype/util"
import type { RootModule } from "../module.js"
import { root, schemaScope } from "../scope.js"

export interface internalKeywordExports {
	lengthBoundable: string | unknown[]
	propertyKey: Key
}

export type internalKeywords = RootModule<internalKeywordExports>

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
