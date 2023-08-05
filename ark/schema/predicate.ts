import type { extend } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import type { BasisRule } from "./constraints/basis.js"
import type { BoundSet } from "./constraints/bound.js"
import type { ConstraintsRecord } from "./constraints/constraint.js"
import type { DivisibilityConstraint } from "./constraints/divisibility.js"
import { EqualityConstraint } from "./constraints/equality.js"
import type { NarrowSet } from "./constraints/narrow.js"
import type { RegexSet } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import { TypeNode } from "./type.js"

export class PredicateNode<
	constraints extends ConstraintsRecord,
	attributes extends AttributesRecord = UniversalAttributes
> extends TypeNode<attributes> {
	declare readonly id: string

	constructor(
		public constraints = {} as constraints,
		attributes = {} as attributes
	) {
		super(attributes)
	}

	readonly flat = Object.values(this.constraints).flat()
	readonly unit =
		this.flat.length === 1 && this.flat[0] instanceof EqualityConstraint
			? this.flat[0]
			: undefined

	writeDefaultDescription() {
		const basisDescription =
			this.writeDefaultBaseDescription?.(this.constraints) ?? "a value"
		const flat = Object.values(this.constraints).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	intersect(other: this): constraints | Disjoint {
		// TODO: include domain disjoints
		if (this.unit) {
			if (other.unit) {
				const result = this.unit.intersect(other.unit)
			}
		}
		const result = { ...this.constraints, ...other.constraints }
		for (const k in result) {
			if (k in this.constraints && k in other.constraints) {
				const setResult = this.constraints[k].intersect(other.constraints[k])
				if (setResult instanceof Disjoint) {
					return setResult
				}
				result[k] = setResult
			}
		}
		return result
	}
}

export type UnitConstraints = {
	readonly value?: EqualityConstraint
}

export type UnknownConstraints = {
	readonly narrow?: NarrowSet
}

export type BasisConstraints<basis extends BasisRule = BasisRule> = extend<
	UnknownConstraints,
	{
		readonly basis: basis
	}
>

export type NumberConstraints = extend<
	BasisConstraints<"number">,
	{
		readonly range?: BoundSet
		readonly divisor?: DivisibilityConstraint
	}
>

export type ObjectConstraints = BasisConstraints<"object">

export type StringConstraints = extend<
	BasisConstraints<"string">,
	{
		readonly length?: BoundSet
		readonly pattern?: RegexSet
	}
>

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1
// Figure out best design for integrating with named props.
export type ArrayConstraints = extend<
	BasisConstraints<typeof Array>,
	{
		readonly length?: BoundSet
		readonly prefixed?: readonly TypeNode[]
		readonly variadic?: TypeNode
		readonly postfixed?: readonly TypeNode[]
	}
>

export type DateConstraints = extend<
	BasisConstraints<typeof Date>,
	{
		readonly range?: BoundSet
	}
>
