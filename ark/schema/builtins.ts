import { cached } from "@arktype/util"
import { node, type TypeNode } from "./node.js"

export const builtins = {
	never: cached(() => node()),
	unknown: cached(() => node({})),
	object: cached(() => node("object")),
	number: cached(() => node("number")),
	nonVariadicArrayIndex: cached(() => node("number")),
	arrayIndexTypeNode: cached(() => node("number")),
	string: cached(() => node("string")),
	array: cached(() => node(Array))
} satisfies Record<string, () => TypeNode>
