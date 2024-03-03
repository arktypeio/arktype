import {
	append,
	conflatenateAll,
	isArray,
	isEmptyObject,
	morph,
	omit,
	pick,
	printable,
	throwInternalError,
	type List,
	type evaluate,
	type listable
} from "@arktype/util"
import { BaseNode, type Node } from "../base.js"
import {
	PropsGroup,
	type ExtraneousKeyBehavior,
	type ExtraneousKeyRestriction,
	type PropsGroupInput
} from "../constraints/props/props.js"
import type { Inner, MutableInner, Prerequisite, Schema } from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import {
	constraintKinds,
	propKinds,
	type BasisKind,
	type ConstraintKind,
	type IntersectionChildKind,
	type OpenNodeKind,
	type PropKind,
	type RefinementKind,
	type TypeIntersection,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { instantiateBasis } from "./basis.js"
import { BaseType } from "./type.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionInner = evaluate<
	BaseMeta & {
		basis?: Node<IntersectionBasisKind>
	} & {
		[k in ConditionalIntersectionKey]?: conditionalInnerValueOfKey<k>
	}
>

export type IntersectionSchema<
	basis extends Schema<IntersectionBasisKind> | undefined = any
> = evaluate<
	BaseMeta & {
		basis?: basis
	} & conditionalSchemaOf<
			basis extends Schema<BasisKind>
				? instantiateBasis<basis>["infer"]
				: unknown
		>
>

type IntersectionCore = Omit<IntersectionInner, ConstraintKind>

const intersectCores = (
	l: IntersectionCore,
	r: IntersectionCore
): MutableInner<"intersection"> | Disjoint => {
	const result: IntersectionCore = {}
	const resultBasis = l.basis
		? r.basis
			? l.basis.intersect(r.basis)
			: l.basis
		: r.basis
	if (resultBasis) {
		if (resultBasis instanceof Disjoint) {
			return resultBasis
		}
		result.basis = resultBasis
	}
	if (l.onExtraneousKey || r.onExtraneousKey) {
		result.onExtraneousKey =
			l.onExtraneousKey === "throw" || r.onExtraneousKey === "throw"
				? "throw"
				: "prune"
	}
	return result
}

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	normalizedSchema: IntersectionSchema
	inner: IntersectionInner
	composition: "composite"
	expectedContext: {
		errors: readonly ArkTypeError[]
	}
	childKind: IntersectionChildKind
}>

const constraintKeys = morph(constraintKinds, (i, kind) => [kind, 1] as const)

const propKeys = morph(
	[...propKinds, "onExtraneousKey"] satisfies (keyof PropsGroupInput)[],
	(i, k) => [k, 1] as const
)

const intersectionChildKeyParser =
	<kind extends IntersectionChildKind>(kind: kind) =>
	(
		input: listable<Schema<kind>>,
		ctx: SchemaParseContext
	): intersectionChildInnerValueOf<kind> | undefined => {
		if (isArray(input)) {
			if (input.length === 0) {
				// Omit empty lists as input
				return
			}
			return input
				.map((schema) => ctx.$.parse(kind, schema as never))
				.sort((l, r) => (l.innerId < r.innerId ? -1 : 1)) as never
		}
		const node = ctx.$.parse(kind, input)
		return node.hasOpenIntersection ? [node] : (node as any)
	}

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

const intersectRightward: TypeIntersection<"intersection"> = (
	intersection,
	r
) => {
	const basis = intersection.basis?.intersect(r) ?? r
	// TODO: meta should not be included here?
	return basis instanceof Disjoint
		? basis
		: {
				...intersection.inner,
				basis
		  }
}

export class IntersectionNode<t = unknown> extends BaseType<
	t,
	IntersectionDeclaration,
	typeof IntersectionNode
> {
	static implementation: nodeImplementationOf<IntersectionDeclaration> =
		this.implement({
			hasAssociatedError: true,
			normalize: (schema) => schema,
			keys: {
				basis: {
					child: true,
					parse: (def, ctx) =>
						ctx.$.parseTypeNode(def, { allowedKinds: ["domain", "proto"] })
				},
				divisor: {
					child: true,
					parse: intersectionChildKeyParser("divisor")
				},
				max: {
					child: true,
					parse: intersectionChildKeyParser("max")
				},
				min: {
					child: true,
					parse: intersectionChildKeyParser("min")
				},
				maxLength: {
					child: true,
					parse: intersectionChildKeyParser("maxLength")
				},
				minLength: {
					child: true,
					parse: intersectionChildKeyParser("minLength")
				},
				length: {
					child: true,
					parse: intersectionChildKeyParser("length")
				},
				before: {
					child: true,
					parse: intersectionChildKeyParser("before")
				},
				after: {
					child: true,
					parse: intersectionChildKeyParser("after")
				},
				pattern: {
					child: true,
					parse: intersectionChildKeyParser("pattern")
				},
				predicate: {
					child: true,
					parse: intersectionChildKeyParser("predicate")
				},
				required: {
					child: true,
					parse: intersectionChildKeyParser("required")
				},
				optional: {
					child: true,
					parse: intersectionChildKeyParser("optional")
				},
				index: {
					child: true,
					parse: intersectionChildKeyParser("index")
				},
				sequence: {
					child: true,
					parse: intersectionChildKeyParser("sequence")
				},
				onExtraneousKey: {
					parse: (def) => (def === "ignore" ? undefined : def)
				}
			},
			reduce: (inner, $) => {
				// TODO: temp nodes
				const rawNode = $.parse("intersection", inner, { prereduced: true })
				// take advantage of the fact that unknown is the identity for
				// intersection to leverage the reduction logic built into
				// the intersectSymmetric method
				const reduced = $.builtin.unknown.and(rawNode)
				return reduced
			},
			defaults: {
				description(inner) {
					const children = Object.values(inner).flat()
					return children.length === 0
						? "an unknown value"
						: children.join(" and ")
				},
				expected(source) {
					return "  • " + source.errors.map((e) => e.expected).join("\n  • ")
				},
				problem(ctx) {
					return `must be...\n${ctx.expected}\n(was ${printable(ctx.data)})`
				}
			},
			intersections: {
				intersection: (l, r) => {
					const result = intersectCores(l.core, r.core)
					if (result instanceof Disjoint) {
						return result
					}
					const flatConstraints = l.constraints.concat(r.constraints)
					if (flatConstraints.length === 0 && result.basis) {
						return result.basis
					}
					const disjoint = new Disjoint({})
					// TODO: are these ordered?
					for (const constraint of flatConstraints) {
						if (result[constraint.kind]) {
						}
						const possibleDisjoint = constraint.reduceIntersection(result)
						if (possibleDisjoint instanceof Disjoint) {
							disjoint.add(possibleDisjoint)
						}
					}
					for (const constraint of flatConstraints) {
						const possibleDisjoint = constraint.reduceIntersection(result)
						if (possibleDisjoint instanceof Disjoint) {
							disjoint.add(possibleDisjoint)
						}
					}
					if (!disjoint.isEmpty()) {
						return disjoint
					}
					return l.$.parse("intersection", result, {
						prereduced: true
					})
				},
				domain: intersectRightward,
				proto: intersectRightward
			}
		})

	// TODO: remove?
	readonly core: IntersectionCore = omit(this.inner, constraintKeys)

	readonly constraints = this.children.filter(
		(child): child is Node<ConstraintKind> => child.isConstraint()
	)
	readonly refinements = this.constraints.filter(
		(node): node is Node<RefinementKind> => node.isRefinement()
	)
	readonly props = maybeCreatePropsGroup(this.inner)
	readonly traversables = conflatenateAll<
		Node<Exclude<IntersectionChildKind, PropKind>> | PropsGroup
	>(this.basis, this.refinements, this.props, this.predicate)

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.traversables.every((traversable) =>
			traversable.traverseAllows(data as never, ctx)
		)

	traverseApply: TraverseApply = (data, ctx) => {
		if (this.basis) {
			this.basis.traverseApply(data, ctx)
			if (ctx.currentErrors.length !== 0) return
		}
		if (this.refinements.length) {
			this.refinements.forEach((node) => node.traverseApply(data as never, ctx))
			if (ctx.currentErrors.length !== 0) return
		}
		if (this.props) {
			this.props.traverseApply(data as never, ctx)
			if (ctx.currentErrors.length !== 0) return
		}
		this.predicate?.forEach((node) => node.traverseApply(data as never, ctx))
	}

	compile(js: NodeCompiler) {
		if (js.traversalKind === "Allows") {
			this.traversables.forEach((traversable) =>
				traversable instanceof BaseNode
					? js.check(traversable)
					: traversable.compile(js)
			)
			return js.return(true)
		}
		if (this.basis) {
			js.check(this.basis)
			// we only have to return conditionally if this is not the last check
			if (this.traversables.length > 1) js.returnIfHasErrors()
		}
		if (this.refinements.length) {
			this.refinements.forEach((node) => js.check(node))
			if (this.props || this.predicate) js.returnIfHasErrors()
		}
		if (this.props) {
			this.props.compile(js)
			if (this.predicate) js.returnIfHasErrors()
		}
		this.predicate?.forEach((node) => js.check(node))
	}
}

const maybeCreatePropsGroup = (inner: IntersectionInner) => {
	const propsInput = pick(inner, propKeys)
	return isEmptyObject(propsInput) ? undefined : new PropsGroup(propsInput)
}

const reduceConstraints = (
	l: List<Node<ConstraintKind>>,
	r: List<Node<ConstraintKind>>
) => {
	let result: readonly Node<ConstraintKind>[] | Disjoint = l
	for (const constraint of r) {
		if (result instanceof Disjoint) {
			break
		}
		result = addConstraint(result, constraint)
	}
	return result instanceof Disjoint ? result : result
}

const flattenedConstraintCache = new Map<
	IntersectionInner,
	List<Node<ConstraintKind>>
>()
const flattenConstraints = (
	inner: IntersectionInner
): List<Node<ConstraintKind>> => {
	const cachedResult = flattenedConstraintCache.get(inner)
	if (cachedResult) {
		return cachedResult
	}
	const result = Object.entries(inner).flatMap(([k, v]) =>
		k === "description" ? [] : (v as listable<Node<ConstraintKind>>)
	)
	flattenedConstraintCache.set(inner, result)
	return result
}

const unflattenConstraints = (
	constraints: List<Node<ConstraintKind>>
): IntersectionInner => {
	const inner: MutableInner<"intersection"> = {}
	for (const constraint of constraints) {
		if (constraint.isBasis()) {
			inner.basis = constraint
		} else if (constraint.hasOpenIntersection) {
			inner[constraint.kind] = append(
				inner[constraint.kind],
				constraint
			) as never
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
		const elementResult = constraint.reduceIntersection(base[i] as never)
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

export type ConditionalTerminalIntersectionSchema = {
	onExtraneousKey?: ExtraneousKeyBehavior
}

export type ConditionalTerminalIntersectionInner = {
	onExtraneousKey?: ExtraneousKeyRestriction
}

type ConditionalTerminalIntersectionKey =
	keyof ConditionalTerminalIntersectionInner

type ConditionalIntersectionKey =
	| ConstraintKind
	| keyof ConditionalTerminalIntersectionInner

type constraintKindOf<t> = {
	[k in ConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConstraintKind]

type conditionalIntersectionKeyOf<t> =
	| constraintKindOf<t>
	| (t extends object ? "onExtraneousKey" : never)

// not sure why explicitly allowing Inner<k> is necessary in these cases,
// but remove if it can be removed without creating type errors
type intersectionChildSchemaValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? listable<Schema<k> | Inner<k>> : Schema<k> | Inner<k>

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind
		? intersectionChildSchemaValueOf<k>
		: ConditionalTerminalIntersectionSchema[k &
				ConditionalTerminalIntersectionKey]

type intersectionChildInnerValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? readonly Node<k>[] : Node<k>

type conditionalInnerValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind
		? intersectionChildInnerValueOf<k>
		: ConditionalTerminalIntersectionInner[k &
				ConditionalTerminalIntersectionKey]

export type conditionalSchemaOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalSchemaValueOfKey<k>
}
