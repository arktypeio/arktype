import type { BaseAttributes, NodeSubclass } from "../base.js"
import { BaseNode } from "../base.js"
import type { ConstraintSet } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"

export type PredicateConstraints = {
	[k: string]: ConstraintSet
}

export type PredicateAttributes = BaseAttributes & { readonly morph?: unknown }

export class PredicateNode<
	subclass extends NodeSubclass<constraints, attributes>,
	constraints extends PredicateConstraints,
	attributes extends BaseAttributes
> extends BaseNode<subclass, constraints, attributes> {
	constructor(constraints = {} as constraints) {
		super(constraints)
	}

	static writeDefaultBaseDescription?(constraints: never): string

	static writeDefaultDescription(constraints: PredicateConstraints) {
		const basisDescription =
			this.writeDefaultBaseDescription?.(constraints as never) ?? "a value"
		const flat = Object.values(constraints).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	static intersectConstraints(
		l: PredicateConstraints,
		r: PredicateConstraints
	) {
		const result = { ...l, ...r }
		for (const k in result) {
			if (k in l && k in r) {
				const setResult = l[k].intersect(r[k])
				if (setResult instanceof Disjoint) {
					return setResult
				}
				result[k] = setResult
			}
		}
		return result
	}
}
