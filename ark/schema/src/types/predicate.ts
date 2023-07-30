import type { Domain, extend } from "@arktype/util"
import type { AttributesRecord } from "../attributes/attribute.js"
import type { DescriptionAttribute } from "../attributes/description.js"
import type { ConstraintsRecord } from "../constraints/constraint.js"
import type { NarrowSet } from "../constraints/narrow.js"
import { Disjoint } from "../disjoint.js"

export type PredicateConstraints<constraints extends ConstraintsRecord> =
	extend<{ readonly narrow?: NarrowSet }, constraints>

export type PredicateAttributes<attributes extends AttributesRecord> = extend<
	{ readonly description?: DescriptionAttribute },
	attributes
>

export abstract class PredicateNode<
	constraints extends PredicateConstraints<ConstraintsRecord>,
	attributes extends
		PredicateAttributes<AttributesRecord> = PredicateAttributes<{}>
> {
	declare readonly id: string

	constructor(
		public constraints = {} as constraints,
		public attributes = {} as attributes
	) {}

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
