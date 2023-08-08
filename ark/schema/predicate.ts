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
	constraints extends ConstraintsRecord = ConstraintsRecord,
	attributes extends AttributesRecord = UniversalAttributes
> extends TypeNode<attributes> {
	declare readonly id: string

	readonly references: readonly TypeNode[] = this.props?.references ?? []

	readonly flat = Object.values(this.rule).flat()
	readonly unit =
		this.flat.length === 1 && this.flat[0] instanceof EqualityConstraint
			? this.flat[0]
			: undefined

	writeDefaultDescription() {
		const basisDescription =
			this.writeDefaultBaseDescription?.(this.rule) ?? "a value"
		const flat = Object.values(this.rule).flat()
		return flat.length
			? `${basisDescription} ${flat.join(" and ")}`
			: basisDescription
	}

	override intersectRules(other: this): constraints | Disjoint {
		// TODO: include domain disjoints
		if (this.unit) {
			if (other.unit) {
				const result = this.unit.intersect(other.unit)
			}
		}
		const result = { ...this.rule, ...other.rule }
		for (const k in result) {
			if (k in this.rule && k in other.rule) {
				const setResult = this.rule[k].intersect(other.rule[k])
				if (setResult instanceof Disjoint) {
					return setResult
				}
				result[k] = setResult
			}
		}
		return result
	}

	compile(ctx: CompilationContext) {
		return ""
		// // TODO: can props imply object basis for compilation?
		// let result = ""
		// this.basis && ctx.bases.push(this.basis)
		// for (const child of children) {
		//     const childResult = child.hasKind("props")
		//         ? child.compile(ctx)
		//         : compileCheck(
		//               // TODO: fix
		//               child.kind === "narrow" ? "custom" : child.kind,
		//               child.rule,
		//               child.compile(ctx),
		//               ctx
		//           )
		//     if (childResult) {
		//         result = result ? `${result}\n${childResult}` : childResult
		//     }
		// }
		// this.basis && ctx.bases.pop()
		// return result
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
