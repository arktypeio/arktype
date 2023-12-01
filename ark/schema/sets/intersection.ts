import {
	includes,
	isArray,
	throwInternalError,
	type evaluate,
	type extend,
	type listable,
	type mutable
} from "@arktype/util"
import type { BaseAttachments, BaseNode, Node } from "../base.js"
import type { BasisKind, instantiateBasis } from "../bases/basis.js"
import type { SchemaParseContext } from "../parse.js"
import type { refinementInputsByKind } from "../refinements/refinement.js"
import { In, type Problems } from "../shared/compilation.js"
import type {
	BaseAttributes,
	NodeAttachments,
	declareNode,
	withAttributes
} from "../shared/declare.js"
import {
	basisKinds,
	closedRefinementKinds,
	defineNode,
	openRefinementKinds,
	type ClosedRefinementKind,
	type ConstraintKind,
	type OpenRefinementKind,
	type RefinementKind
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { Schema } from "../shared/nodes.js"
import { isNode } from "../shared/symbols.js"
import { BaseType } from "../type.js"

export type IntersectionInner = withAttributes<
	{ basis?: Node<BasisKind> } & {
		[k in RefinementKind]?: k extends OpenRefinementKind
			? readonly Node<k>[]
			: Node<k>
	}
>

export type IntersectionSchema<
	basis extends Schema<BasisKind> | undefined = any
> = evaluate<
	{
		basis?: basis
	} & refinementInputsByKind<
		basis extends Schema<BasisKind> ? instantiateBasis<basis>["infer"] : unknown
	> &
		BaseAttributes
>

export type ConstraintSet = readonly Node<ConstraintKind>[]

export type IntersectionAttachments = extend<
	NodeAttachments<"intersection">,
	{
		constraints: ConstraintSet
		refinements: readonly Node<RefinementKind>[]
	}
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	inner: IntersectionInner
	intersections: {
		intersection: "intersection" | Disjoint
		default: "intersection" | Disjoint
	}
	attach: IntersectionAttachments
}>

export const IntersectionImplementation = defineNode({
	kind: "intersection",
	normalize: (def) => def,
	addContext: (ctx) => {
		const def = ctx.definition as IntersectionSchema
		ctx.basis = def.basis && ctx.scope.parseTypeNode(def.basis, basisKinds)
	},
	keys: {
		basis: {
			child: true,
			// the basis has already been preparsed and added to context
			parse: (_, ctx) => ctx.basis
		},
		divisor: {
			child: true,
			parse: (def, ctx) => parseClosedRefinement("divisor", def, ctx)
		},
		max: {
			child: true,
			parse: (def, ctx) => parseClosedRefinement("max", def, ctx)
		},
		min: {
			child: true,
			parse: (def, ctx) => parseClosedRefinement("min", def, ctx)
		},
		maxLength: {
			child: true,
			parse: (def, ctx) => parseClosedRefinement("maxLength", def, ctx)
		},
		minLength: {
			child: true,
			parse: (def, ctx) => parseClosedRefinement("minLength", def, ctx)
		},
		before: {
			child: true,
			parse: (def, ctx) => parseClosedRefinement("before", def, ctx)
		},
		after: {
			child: true,
			parse: (def, ctx) => parseClosedRefinement("after", def, ctx)
		},
		pattern: {
			child: true,
			parse: (def, ctx) => parseOpenRefinement("pattern", def, ctx)
		},
		predicate: {
			child: true,
			parse: (def, ctx) => parseOpenRefinement("predicate", def, ctx)
		},
		optional: {
			child: true,
			parse: (def, ctx) => parseOpenRefinement("optional", def, ctx)
		},
		required: {
			child: true,
			parse: (def, ctx) => parseOpenRefinement("required", def, ctx)
		}
	},
	intersections: {
		intersection: (l, r) => {
			let result: readonly Node<ConstraintKind>[] | Disjoint = l.constraints
			for (const refinement of r.refinements) {
				if (result instanceof Disjoint) {
					break
				}
				result = addConstraint(result, refinement)
			}
			return result instanceof Disjoint ? result : unflattenConstraints(result)
		},
		default: (l, r) => {
			const result = addConstraint(l.constraints, r)
			return result instanceof Disjoint ? result : unflattenConstraints(result)
		}
	},
	reduce: (inner, scope) => {
		const { description, ...constraintsByKind } = inner
		const inputConstraints = Object.values(
			constraintsByKind
		).flat() as ConstraintSet
		const reducedConstraints = reduceConstraints([], inputConstraints)
		if (reducedConstraints instanceof Disjoint) {
			return reducedConstraints.throw()
		}
		if (reducedConstraints.length === 1 && reducedConstraints[0].isBasis()) {
			// TODO: description?
			return reducedConstraints[0]
		}
		if (reducedConstraints.length === inputConstraints.length) {
			return
		}
		const reducedConstraintsByKind = unflattenConstraints(
			reducedConstraints
		) as mutable<IntersectionInner>
		if (description) {
			reducedConstraintsByKind.description = description
		}
		return scope.parsePrereduced("intersection", reducedConstraintsByKind)
	},
	attach: (node) => {
		const constraints: mutable<ConstraintSet> = []
		const refinements: Node<RefinementKind>[] = []
		for (const [k, v] of node.entries) {
			if (k === "basis") {
				constraints.push(v)
			} else if (includes(openRefinementKinds, k)) {
				constraints.push(...(v as any))
				refinements.push(...(v as any))
			} else if (includes(closedRefinementKinds, k)) {
				constraints.push(v as never)
				refinements.push(v as never)
			}
		}
		return {
			constraints,
			refinements,
			traverseAllows: (data, problems) =>
				constraints.every((c) => c.traverseAllows(data as never, problems)),
			traverseApply: (data, problems) =>
				constraints.forEach((c) => c.traverseApply(data as never, problems))
		}
	},
	compile: (node, ctx) => {
		const constraintInvocations = node.constraints.map(
			(constraint) =>
				`this.${constraint.id}(${In}${
					ctx.compilationKind === "allows" ? "" : ", problems"
				})`
		)
		return ctx.compilationKind === "allows"
			? constraintInvocations
					.map(
						(call) => `if(!${call}) return false
`
					)
					.join("\n") +
					"\n" +
					"return true"
			: constraintInvocations.join("\n")
	},
	writeDefaultDescription: (node) => {
		return node.constraints.length === 0
			? "an unknown value"
			: node.constraints.join(" and ")
	}
})

export class IntersectionNode<t = unknown> extends BaseType<t> {
	constructor(baseAttachments: BaseAttachments) {
		super(baseAttachments)
	}
}

export const parseClosedRefinement = <kind extends ClosedRefinementKind>(
	kind: kind,
	input: Schema<kind>,
	ctx: SchemaParseContext
): Node<kind> => {
	const refinement = ctx.scope.parseNode(kind, input) as Node<RefinementKind>
	refinement.assertValidBasis(ctx.basis)
	return refinement as never
}

export const parseOpenRefinement = <kind extends OpenRefinementKind>(
	kind: kind,
	input: listable<Schema<kind>>,
	ctx: SchemaParseContext
) => {
	if (isArray(input)) {
		if (input.length === 0) {
			// Omit empty lists as input
			return
		}
		const refinements = input
			.map((refinement) => ctx.scope.parseNode(kind, refinement))
			.sort((l, r) => (l.innerId < r.innerId ? -1 : 1))
		// we should only need to assert validity for one, as all listed
		// refinements should be of the same kind and therefore have the same
		// operand requirements
		refinements[0].assertValidBasis(ctx.basis)
		return refinements
	}
	const refinement = ctx.scope.parseNode(kind, input)
	refinement.assertValidBasis(ctx.basis)
	return [refinement]
}

const reduceConstraints = (
	l: readonly Node<ConstraintKind>[],
	r: readonly Node<ConstraintKind>[]
) => {
	let result: readonly Node<ConstraintKind>[] | Disjoint = l
	for (const refinement of r) {
		if (result instanceof Disjoint) {
			break
		}
		result = addConstraint(result, refinement)
	}
	return result instanceof Disjoint ? result : result
}

export const flattenConstraints = (inner: IntersectionInner): ConstraintSet =>
	Object.values(inner).flatMap((v) => (isNode(v) ? v : isArray(v) ? v : []))

export const unflattenConstraints = (
	constraints: ConstraintSet
): IntersectionInner => {
	const inner: mutable<IntersectionInner> = {}
	for (const constraint of constraints) {
		if (constraint.isBasis()) {
			inner.basis = constraint
		} else if (constraint.isOpenRefinement()) {
			inner[constraint.kind] ??= [] as any
			;(inner as any)[constraint.kind].push(constraint)
		} else if (constraint.isClosedRefinement()) {
			if (inner[constraint.kind]) {
				return throwInternalError(
					`Unexpected intersection of closed refinements of kind ${constraint.kind}`
				)
			}
			inner[constraint.kind] = constraint as never
		}
	}
	return inner
}

export const addConstraint = (
	base: readonly Node<ConstraintKind>[],
	constraint: Node<ConstraintKind>
): Node<ConstraintKind>[] | Disjoint => {
	const result: Node<ConstraintKind>[] = []
	let includesRefinement = false
	for (let i = 0; i < base.length; i++) {
		const elementResult = constraint.intersectClosed(base[i])
		if (elementResult === null) {
			result.push(base[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesRefinement) {
			result.push(elementResult)
			includesRefinement = true
		} else if (!result.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${elementResult}`
			)
		}
	}
	if (!includesRefinement) {
		result.push(constraint)
	}
	return result
}

// export class ArrayPredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Array>,
// 	Boundable
// ) {
// 	// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// 	// to a single variadic number prop with minLength 1
// 	// Figure out best design for integrating with named props.

// 	readonly prefix?: readonly TypeRoot[]
// 	readonly variadic?: TypeRoot
// 	readonly postfix?: readonly TypeRoot[]
// }

// export class DatePredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Date>,
// 	Boundable
// ) {}
