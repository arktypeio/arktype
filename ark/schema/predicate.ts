import type { Domain, extend, mutable } from "@arktype/util"
import type { BasisRule } from "./constraints/basis.js"
import type { BoundSet } from "./constraints/bound.js"
import type { Constraint } from "./constraints/constraint.js"
import type { DivisibilityConstraint } from "./constraints/divisibility.js"
import type { EqualityConstraint } from "./constraints/equality.js"
import type { NarrowSet } from "./constraints/narrow.js"
import type { RegexSet } from "./constraints/regex.js"
import { Disjoint } from "./disjoint.js"
import { TypeNode } from "./type.js"

export type ConstraintSet = readonly Constraint[]

export class PredicateNode extends TypeNode<ConstraintSet> {
	declare readonly id: string

	// readonly references: readonly TypeNode[] = this.props?.references ?? []

	readonly domain: Domain = "string"

	// readonly flat = Object.values(this.rule).flat()
	// readonly unit =
	// 	this.flat.length === 1 && this.flat[0] instanceof EqualityConstraint
	// 		? this.flat[0]
	// 		: undefined

	writeDefaultDescription() {
		const basisDescription =
			this.writeDefaultBaseDescription?.(this.rule) ?? "a value"
		const flat = Object.values(this.rule).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	// TODO: make sure in cases like range, the result is sorted
	intersect(other: ConstraintSet<constraints>) {
		const result = [] as mutable<ConstraintSet>
		let includesConstraint = false
		for (let i = 0; i < this.rule.length; i++) {
			const elementResult = this.rule[i].intersect(constraint)
			if (elementResult === null) {
				result.push(this.rule[i])
			} else if (elementResult instanceof Disjoint) {
				return elementResult
			} else {
				result.push(elementResult)
				includesConstraint = true
			}
		}
		if (!includesConstraint) {
			result.push(constraint)
		}
		for (
			let i = 0;
			i < other.length && setResult instanceof ConstraintSet;
			i++
		) {
			setResult = setResult.add(other[i])
		}
		return setResult
	}

	constrain(constraint: Constraint): PredicateNode {
		return this.intersect(new PredicateNode([constraint], {}))
	}

	// keyof(): TypeNode {
	// 	if (!this.basis) {
	// 		return builtins.never()
	// 	}
	// 	const propsKey = this.props?.keyof()
	// 	return propsKey?.or(this.basis.keyof()) ?? this.basis.keyof()
	// }

	// constrain<kind extends ConstraintKind>(
	// 	kind: kind,
	// 	rule: InputDefinitions,
	// 	// TODO: Fix NodeInputs
	// 	meta: {}
	// ): PredicateNode {
	// 	// TODO: this cast shouldn't be needed
	// 	const constraint = createNode([kind, rule, meta as never])
	// 	assertAllowsConstraint(this.basis, constraint)
	// 	const result = this.intersect(
	// 		// TODO: fix cast
	// 		new PredicateNode({ [kind]: constraint as never }, this.meta)
	// 	)
	// 	if (result instanceof Disjoint) {
	// 		return result.throw()
	// 	}
	// 	return result
	// }
}

// throwParseError(
//     `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//         constraintsByPrecedence
//     ).join(", ")})`
// )

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

// // TODO: naming
// export const constraintsByPrecedence: Record<
// 	BasisKind | RefinementKind,
// 	number
// > = {
// 	// basis
// 	domain: 0,
// 	class: 0,
// 	unit: 0,
// 	// shallow
// 	bound: 1,
// 	divisor: 1,
// 	regex: 1,
// 	// deep
// 	props: 2,
// 	// narrow
// 	narrow: 3
// }
