import type { Key } from "@arktype/util"
import type { TypeNode } from "../base.js"
import { space } from "../space.js"

export interface internalPrimitive {
	lengthBoundable: TypeNode<string | unknown[]>
	propertyKey: TypeNode<Key>
}

export const internalPrimitive: internalPrimitive = space(
	{
		lengthBoundable: ["string", Array],
		propertyKey: ["string", "symbol"]
	},
	{
		prereducedAliases: true,
		registerKeywords: true
	}
)
