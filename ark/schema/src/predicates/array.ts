import type { evaluate } from "@arktype/util"
import type { BaseAttributes } from "../base.js"
import type { Type } from "../type.js"
import type { ObjectConstraints } from "./object.js"
import { ObjectNode } from "./object.js"

export type ArrayConstraints = evaluate<
	ObjectConstraints & {
		readonly prefixed?: readonly Type[]
		readonly variadic?: Type
		readonly postfixed?: readonly Type[]
	}
>

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1
// Figure out best design for integrating with named props.
export class ArrayNode extends ObjectNode<
	typeof ArrayNode,
	ArrayConstraints,
	BaseAttributes
> {
	static override writeDefaultBaseDescription() {
		return "an array"
	}
}
