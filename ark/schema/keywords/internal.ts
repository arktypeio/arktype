import type { Key } from "@arktype/util"
import type { SchemaModule } from "../module.js"
import { schemaScope } from "../scope.js"

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
