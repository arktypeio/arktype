import { cached } from "@arktype/util"
import type { TypeNode } from "./type.js"
import { node } from "./type.js"

export const builtins = {
	never: cached(() => node()),
	unknown: cached(() => node({})),
	object: cached(() => node("object")),
	number: cached(() => node("number")),
	// TODO: fix
	nonVariadicArrayIndex: cached(() => node("number")),
	arrayIndexTypeNode: cached(() => node("number")),
	string: cached(() => node("string")),
	array: cached(() => node(Array))
} satisfies Record<string, () => TypeNode>
