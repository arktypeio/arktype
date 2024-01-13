import {
	isArray,
	throwInternalError,
	type listable,
	type mutable
} from "@arktype/util"
import type { Node } from "../base.js"
import type {
	ClosedComponentKind,
	Declaration,
	OpenComponentKind,
	Prerequisite,
	Schema,
	hasOpenIntersection,
	reducibleKindOf
} from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type {
	CompilationContext,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type { declareNode, withBaseMeta } from "../shared/declare.js"
import {
	basisKinds,
	type BasisKind,
	type ComponentKind,
	type ConstraintKind,
	type nodeImplementationOf
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkError } from "../traversal/errors.js"
import type { instantiateBasis } from "./basis.js"
import { BaseType } from "./type.js"

export type IntersectionInner = { basis?: Node<BasisKind> } & {
	[k in ComponentKind]?: k extends OpenComponentKind
		? readonly Node<k>[]
		: Node<k>
}

export type IntersectionSchema<
	basis extends Schema<BasisKind> | undefined = any
> = withBaseMeta<
	{
		basis?: basis
	} & componentInputsByKind<
		basis extends Schema<BasisKind> ? instantiateBasis<basis>["infer"] : unknown
	>
>

export type ConstraintSet = readonly Node<ConstraintKind>[]

export type IntersectionAttachments = {
	constraints: ConstraintSet
	refinements: readonly Node<ComponentKind>[]
}

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	normalizedSchema: IntersectionSchema
	inner: IntersectionInner
	intersections: {
		intersection: "intersection" | Disjoint
		default: "intersection" | Disjoint
	}
	errorContext: {
		errors: readonly ArkError[]
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
	IntersectionDeclaration,
	typeof IntersectionNode
> {
	static implementation: nodeImplementationOf<IntersectionDeclaration> =
		this.implement({
			normalize: (def) => def,
			addContext: (ctx) => {
				const def = ctx.definition as IntersectionSchema
				ctx.basis = def.basis && ctx.$.parseTypeNode(def.basis, basisKinds)
			},
			keys: {
				basis: {
					child: true,
					// the basis has already been preparsed and added to context
					parse: (_, ctx) => ctx.basis
				},
				divisor: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("divisor", def, ctx)
				},
				max: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("max", def, ctx)
				},
				min: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("min", def, ctx)
				},
				maxLength: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("maxLength", def, ctx)
				},
				minLength: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("minLength", def, ctx)
				},
				before: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("before", def, ctx)
				},
				after: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("after", def, ctx)
				},
				pattern: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("pattern", def, ctx)
				},
				predicate: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("predicate", def, ctx)
				},
				optional: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("optional", def, ctx)
				},
				required: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("required", def, ctx)
				},
				index: {
					child: true,
					parse: (def, ctx) => parseOpenComponent("index", def, ctx)
				},
				sequence: {
					child: true,
					parse: (def, ctx) => parseClosedComponent("sequence", def, ctx)
				}
			},
			reduce: (inner, meta, scope) => {
				const inputConstraints = Object.values(inner).flat() as ConstraintSet
				const reducedConstraints = reduceConstraints([], inputConstraints)
				if (reducedConstraints instanceof Disjoint) {
					return reducedConstraints.throw()
				}
				if (
					reducedConstraints.length === 1 &&
					reducedConstraints[0].isBasis()
				) {
					// TODO: description?
					return reducedConstraints[0]
				}
				if (reducedConstraints.length === inputConstraints.length) {
					return
				}
				const reducedSchema = Object.assign(
					unflattenConstraints(reducedConstraints),
					meta
				)
				return scope.parsePrereduced("intersection", reducedSchema)
			},
			intersections: {
				intersection: (l, r) => {
					let result: readonly Node<ConstraintKind>[] | Disjoint = l.constraints
					for (const refinement of r.constraints) {
						if (result instanceof Disjoint) {
							break
						}
						result = addConstraint(result, refinement)
					}
					return result instanceof Disjoint
						? result
						: unflattenConstraints(result)
				},
				default: (l, r) => {
					const result = addConstraint(l.constraints, r)
					return result instanceof Disjoint
						? result
						: unflattenConstraints(result)
				}
			},
			defaults: {
				description(inner) {
					const constraints = Object.values(inner)
					return constraints.length === 0
						? "an unknown value"
						: constraints.join(" and ")
				}
			}
		})

	readonly constraints: ConstraintSet = Object.values(this.inner).flat()

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.constraints.every((c) => c.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply = (data, ctx) =>
		this.constraints.forEach((c) => c.traverseApply(data as never, ctx))

	compileBody(ctx: CompilationContext) {
		const constraintInvocations = this.constraints.map(
			(constraint) =>
				`this.${constraint.id}(${ctx.dataArg}${
					ctx.compilationKind === "allows" ? "" : ", ctx"
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

export type ComponentIntersectionInputsByKind = {
	[k in ComponentKind]: hasOpenIntersection<Declaration<k>> extends true
		? listable<Schema<k>>
		: Schema<k>
}

export type componentKindOf<t> = {
	[k in ComponentKind]: t extends Prerequisite<k> ? k : never
}[ComponentKind]

export type ComponentIntersectionInput<
	kind extends ComponentKind = ComponentKind
> = ComponentIntersectionInputsByKind[kind]

export type componentInputsByKind<t> = {
	[k in componentKindOf<t>]?: ComponentIntersectionInput<k>
}

export const parseClosedComponent = <kind extends ClosedComponentKind>(
	kind: kind,
	input: Schema<kind>,
	ctx: SchemaParseContext
): Node<kind> => {
	const refinement = ctx.$.parseNode(kind, input) as Node<ComponentKind>
	refinement.assertValidBasis(ctx.basis)
	return refinement as never
}

export const parseOpenComponent = <kind extends OpenComponentKind>(
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
			.map((refinement) => ctx.$.parseNode(kind, refinement))
			.sort((l, r) => (l.innerId < r.innerId ? -1 : 1))
		// we should only need to assert validity for one, as all listed
		// refinements should be of the same kind and therefore have the same
		// operand requirements
		refinements[0].assertValidBasis(ctx.basis)
		return refinements
	}
	const refinement = ctx.$.parseNode(kind, input)
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
		} else if (constraint.hasOpenIntersection) {
			inner[constraint.kind] ??= [] as any
			;(inner as any)[constraint.kind].push(constraint)
		} else {
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
	let includesComponent = false
	for (let i = 0; i < base.length; i++) {
		const elementResult = constraint.intersectClosed(base[i])
		if (elementResult === null) {
			result.push(base[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesComponent) {
			result.push(elementResult)
			includesComponent = true
		} else if (!result.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${elementResult}`
			)
		}
	}
	if (!includesComponent) {
		result.push(constraint)
	}
	return result
}
