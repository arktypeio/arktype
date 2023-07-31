import type { Domain } from "@arktype/util"
import type {
	AttributesRecord,
	UniversalAttributes
} from "../attributes/attribute.js"
import type { ConstraintsRecord } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import { TypeNode } from "../type.js"

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
			if (k in this.constraints && k in other.constraints) {
				const setResult = this.constraints[k].intersect(other.constraints[k])
				if (setResult instanceof Disjoint) {
					return setResult
				}
				result[k] = setResult
			}
		}
		return new (this.constructor as any)(result) as this
	}
}
