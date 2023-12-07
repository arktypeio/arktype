import {
	isArray,
	throwInternalError,
	type listable,
	type mutable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { BasisKind, instantiateBasis } from "../bases/basis.js"
import type { SchemaParseContext } from "../parse.js"
import type { refinementInputsByKind } from "../refinements/refinement.js"
import {
	In,
	type CompilationContext,
	type Problems
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import {
	basisKinds,
	type ClosedRefinementKind,
	type ConstraintKind,
	type NodeParserImplementation,
	type OpenRefinementKind,
	type RefinementKind
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { NodeIntersections } from "../shared/intersect.js"
import type { Schema, reducibleKindOf } from "../shared/nodes.js"
import { BaseType } from "../type.js"

export type IntersectionInner = { basis?: Node<BasisKind> } & {
	[k in RefinementKind]?: k extends OpenRefinementKind
		? readonly Node<k>[]
		: Node<k>
}

export type IntersectionSchema<
	basis extends Schema<BasisKind> | undefined = any
> = withAttributes<
	{
		basis?: basis
	} & refinementInputsByKind<
		basis extends Schema<BasisKind> ? instantiateBasis<basis>["infer"] : unknown
	>
>

export type ConstraintSet = readonly Node<ConstraintKind>[]

export type IntersectionAttachments = {
	constraints: ConstraintSet
	refinements: readonly Node<RefinementKind>[]
}

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	inner: IntersectionInner
	intersections: {
		intersection: "intersection" | Disjoint
		default: "intersection" | Disjoint
	}
}>

// 	readonly literalKeys = this.named.map((prop) => prop.key.name)
// 	readonly namedKeyOf = cached(() => node.unit(...this.literalKeys))
// 	readonly indexedKeyOf = cached(
// 		() =>
// 			new TypeNode(
// 				this.indexed.flatMap((entry) => entry.key.branches),
// 				this.meta
// 			)
// 	)
// 	readonly keyof = cached(() => this.namedKeyOf().or(this.indexedKeyOf()))

// get(key: string | TypeNode) {
// 	return typeof key === "string"
// 		? this.named.find((entry) => entry.value.branches)?.value
// 		: this.indexed.find((entry) => entry.key.equals(key))?.value
// }

// compile(ctx: CompilationContext) {
// 	if (this.indexed.length === 0) {
// 		return compileNamedProps(this.named, ctx)
// 	}
// 	if (this.indexed.length === 1) {
// 		// if the only unenumerable set of props are the indices of an array, we can iterate over it instead of checking each key
// 		const indexMatcher = extractArrayIndexRegex(this.indexed[0].key)
// 		if (indexMatcher) {
// 			return compileArray(
// 				indexMatcher,
// 				this.indexed[0].value,
// 				this.named,
// 				ctx
// 			)
// 		}
// 	}
// 	return compileIndexed(this.named, this.indexed, ctx)
// }

export class IntersectionNode<t = unknown> extends BaseType<
	t,
	IntersectionDeclaration
> {
	static parser: NodeParserImplementation<IntersectionDeclaration> = {
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
			},
			index: {
				child: true,
				parse: (def, ctx) => parseOpenRefinement("index", def, ctx)
			},
			sequence: {
				child: true,
				parse: (def, ctx) => parseOpenRefinement("sequence", def, ctx)
			}
		},
		reduce: (inner, scope) => {
			const inputConstraints = Object.values(inner).flat() as ConstraintSet
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
			return scope.parsePrereduced("intersection", reducedConstraintsByKind)
		}
	}

	static intersections: NodeIntersections<IntersectionDeclaration> = {
		intersection: (l, r) => {
			let result: readonly Node<ConstraintKind>[] | Disjoint = l.constraints
			for (const refinement of r.constraints) {
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
	}

	readonly constraints: ConstraintSet = Object.values(this.inner).flat()

	traverseAllows = (data: unknown, problems: Problems): boolean =>
		this.constraints.every((c) => c.traverseAllows(data as never, problems))

	traverseApply = (data: unknown, problems: Problems) =>
		this.constraints.forEach((c) => c.traverseApply(data as never, problems))

	writeDefaultDescription() {
		return this.constraints.length === 0
			? "an unknown value"
			: this.constraints.join(" and ")
	}

	compileBody(ctx: CompilationContext) {
		const constraintInvocations = this.constraints.map(
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
): readonly Node<reducibleKindOf<kind>>[] | undefined => {
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
