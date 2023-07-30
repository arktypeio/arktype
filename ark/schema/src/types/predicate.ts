import type { Domain } from "@arktype/util"
import type { ConstraintSet } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"

export type PredicateConstraints = {
	[k: string]: ConstraintSet
}

export type PredicateAttributes = BaseAttributes & { readonly morph?: unknown }

export abstract class PredicateNode<
	constraints extends PredicateConstraints,
	attributes extends BaseAttributes
> {
	declare readonly id: string

	constructor(
		public constraints = {} as constraints,
		public attributes = {} as attributes
	) {
		// this.description = this.subclass.writeDefaultDescription(constraints)
	}

	abstract readonly domain: Domain | null
	abstract writeDefaultBaseDescription(constraints: constraints): string

	writeDefaultDescription() {
		const basisDescription =
			this.writeDefaultBaseDescription?.(this.constraints) ?? "a value"
		const flat = Object.values(this.constraints).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	intersect(other: this): this | Disjoint {
		const result = { ...this.constraints, ...other.constraints }
		for (const k in result) {
			if (k in l && k in r) {
				const setResult = l[k].intersect(r[k])
				if (setResult instanceof Disjoint) {
					return setResult
				}
				result[k] = setResult
			}
		}
		return new (this.constructor as any)(result) as this
	}
}
