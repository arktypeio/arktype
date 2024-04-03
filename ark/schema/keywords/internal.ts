import type { Key } from "@arktype/util"
import { space } from "../scope.js"
import type { spaceFromExports } from "./utils/utils.js"

export namespace internalKeywords {
	export interface exports {
		lengthBoundable: string | unknown[]
		propertyKey: Key
	}
}

export type internalKeywords = spaceFromExports<internalKeywords.exports>

export const internalKeywords: internalKeywords = space(
	{
		lengthBoundable: ["string", Array],
		propertyKey: ["string", "symbol"]
	},
	{
		prereducedAliases: true
	}
)
