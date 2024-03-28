import type { Key } from "@arktype/util"
import { space } from "../space.js"
import type { UnionNode } from "../types/union.js"

export interface internalPrimitive {
	lengthBoundable: UnionNode<string | unknown[]>
	propertyKey: UnionNode<Key>
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
