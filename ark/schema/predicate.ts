import type { extend } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "./attributes/attribute.js"
import type { ConstraintsRecord } from "./constraints/constraint.js"
import { EqualityConstraint } from "./constraints/equality.js"
import type { NarrowSet } from "./constraints/narrow.js"
import { Disjoint } from "./disjoint.js"
import type { NonEnumerableDomain } from "./old/primitive/domain.js"
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

export type UnknownConstraints = {
	readonly narrow?: NarrowSet
}

export type DomainConstraints<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = extend<
	UnknownConstraints,
	{
		readonly basis: {}
	}
>

export type UnitConstraints = {
	readonly value?: EqualityConstraint
}

export type NumberConstraints = extend<
	DomainConstraints,
	{
		readonly range?: BoundSet
		readonly divisor?: DivisibilityConstraint
	}
>

export type ObjectConstraints<constraints extends ConstraintsRecord> = extend<
	DomainConstraints,
	{
		readonly instanceOf?: ConstructorConstraint
	} & constraints
>

export type StringConstraints = {
	readonly length?: BoundSet
	readonly pattern?: RegexSet
}

// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// to a single variadic number prop with minLength 1
// Figure out best design for integrating with named props.
export type ArrayConstraints = ObjectConstraints<{
	readonly length?: BoundSet
	// readonly prefixed?: readonly Type[]
	// readonly variadic?: Type
	// readonly postfixed?: readonly Type[]
}>

export type DateConstraints = extend<
	DomainConstraints,
	{
		readonly range?: BoundSet
	}
>
