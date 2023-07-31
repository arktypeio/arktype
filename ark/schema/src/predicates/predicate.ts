import type { Domain, extend } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "../attributes/attribute.js"
import type { ConstraintsRecord } from "../constraints/constraint.js"
import { EqualityConstraint } from "../constraints/equality.js"
import type { NarrowSet } from "../constraints/narrow.js"
import { Disjoint } from "../disjoint.js"
import { TypeNode } from "../type.js"

export type DomainConstraints = { readonly narrow?: NarrowSet }
export type UnitConstraints = { readonly value?: EqualityConstraint }

export abstract class PredicateNode<
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

	abstract readonly domain: Domain | null
	abstract writeDefaultBaseDescription(constraints: constraints): string

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
		if (this.unit) {
			if (other.unit) {
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
