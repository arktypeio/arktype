import type { extend, listable } from "@arktype/utils"
import type { CompilationContext } from "../../compiler/compile.js"
import { assertAllowsConstraint } from "../../parser/semantic/validate.js"
import type { Narrow } from "../../parser/tuple.js"
import { NodeBase } from "../base.js"
import { Disjoint } from "../disjoint.js"
import type { Node, NodeIntersections, NodeKind, NodeKinds } from "../kinds.js"
import { createNode } from "../kinds.js"
import type { BasisInput, BasisKind } from "../primitive/basis.js"
import type { BoundGroupInput } from "../primitive/bound.js"
import type { SerializedRegexLiteral } from "../primitive/regex.js"
import type { PropsInput } from "../prop/parse.js"
import type { TypeNode } from "../type.js"
import { builtins } from "../union/utils.js"

export type Constraints = {
	readonly [k in ConstraintKind as k extends BasisKind
		? "basis"
		: k]?: NodeIntersections[k]
}

export type Constraint<k extends keyof Constraints = keyof Constraints> =
	Constraints[k] & {}

export type ConstraintKind = BasisKind | RefinementKind

type InputDefinitions = extend<
	Record<keyof Constraints, unknown>,
	{
		basis: BasisInput
		bound: BoundGroupInput
		divisor: number
		regex: listable<SerializedRegexLiteral>
		narrow: listable<Narrow>
		props: PropsInput
	}
>

export type ConstraintInputs = Partial<InputDefinitions>

export type RefinementKind = extend<
	NodeKind,
	"bound" | "divisor" | "regex" | "props" | "narrow"
>

export type Refinement = NodeKinds[RefinementKind]

// throwParseError(
//     `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//         constraintsByPrecedence
//     ).join(", ")})`
// )

export type PredicateChildren =
	| readonly []
	| readonly [Node<BasisKind>, ...Refinement[]]

export const predicateNode = (input: ConstraintInputs) =>
	new PredicateNode(input as never, {})

export class PredicateNode
	extends NodeBase<{
		rule: Constraints
		intersection: PredicateNode
		meta: {}
	}>
	implements Constraints
{
	readonly kind = "predicate"
	readonly basis?: Constraint<"basis">
	readonly bound?: Constraint<"bound">
	readonly divisor?: Constraint<"divisor">
	readonly regex?: Constraint<"regex">
	readonly props?: Constraint<"props">
	readonly narrow?: Constraint<"narrow">

	readonly children = Object.values(this.rule).flat()
	// we only want simple unmorphed values
	readonly unit =
		this.basis?.hasKind("unit") && this.children.length === 1
			? this.basis
			: undefined

	readonly references: readonly TypeNode[] = this.props?.references ?? []

	intersect(other: PredicateNode): PredicateNode | Disjoint {
		const basis = this.basis
			? other.basis
				? this.basis.intersect(other.basis)
				: this.basis
			: other.basis
		if (basis instanceof Disjoint) {
			return basis
		}
		// TODO: figure out how .value works with morphs & other metadata
		if (this.basis?.hasKind("unit")) {
			if (!other.allows(this.basis.rule)) {
				return Disjoint.from("assignability", other, this.basis)
			}
		} else if (other.basis?.hasKind("unit")) {
			if (!this.allows(other.basis.rule)) {
				return Disjoint.from("assignability", this, other.basis)
			}
		}
		return this
		// const rules: Constraint[] = basis ? [basis] : []
		// for (const kind of constraintKindNames) {
		//     const lNode = this.getConstraints(kind)
		//     const rNode = other.getConstraints(kind)
		//     if (lNode) {
		//         if (rNode) {
		//             // TODO: fix
		//             const result = lNode
		//             // lNode.intersect(rNode as never)
		//             // we may be missing out on deep discriminants here if e.g.
		//             // there is a range Disjoint between two arrays, each of which
		//             // contains objects that are discriminable. if we need to find
		//             // these, we should avoid returning here and instead collect Disjoints
		//             // similarly to in PropsNode
		//             if (result instanceof Disjoint) {
		//                 return result
		//             }
		//             rules.push(result)
		//         } else {
		//             rules.push(lNode)
		//         }
		//     } else if (rNode) {
		//         rules.push(rNode)
		//     }
		// }
		// // TODO: bad context source
		// return new PredicateNode(rules, this.meta)
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

	describe() {
		return this.children.length === 0
			? "unknown"
			: this.children.length === 1
			? `${this.basis}`
			: `(${this.children.map((child) => child.toString()).join(" and ")})`
	}

	keyof(): TypeNode {
		if (!this.basis) {
			return builtins.never()
		}
		const propsKey = this.props?.keyof()
		return propsKey?.or(this.basis.keyof()) ?? this.basis.keyof()
	}

	constrain<kind extends ConstraintKind>(
		kind: kind,
		rule: InputDefinitions,
		// TODO: Fix NodeInputs
		meta: {}
	): PredicateNode {
		// TODO: this cast shouldn't be needed
		const constraint = createNode([kind, rule, meta as never])
		assertAllowsConstraint(this.basis, constraint)
		const result = this.intersect(
			// TODO: fix cast
			new PredicateNode({ [kind]: constraint as never }, this.meta)
		)
		if (result instanceof Disjoint) {
			return result.throw()
		}
		return result
	}
}

// TODO: naming
export const constraintsByPrecedence: Record<
	BasisKind | RefinementKind,
	number
> = {
	// basis
	domain: 0,
	class: 0,
	unit: 0,
	// shallow
	bound: 1,
	divisor: 1,
	regex: 1,
	// deep
	props: 2,
	// narrow
	narrow: 3
}
