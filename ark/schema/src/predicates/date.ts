import type { evaluate } from "@arktype/util"
import type { BaseAttributes } from "../base.js"
import type { BoundSet } from "../constraints/bound.js"
import { ObjectNode } from "./object.js"
import type { ObjectConstraints } from "./object.js"

export type DateConstraints = evaluate<
	ObjectConstraints & { readonly bound?: BoundSet }
>

export class DateNode extends ObjectNode<
	typeof DateNode,
	DateConstraints,
	BaseAttributes
> {
	static override writeDefaultBaseDescription() {
		return "a date"
	}
}
