import {
	append,
	appendUnique,
	conflatenateAll,
	entriesOf,
	isArray,
	isEmptyObject,
	omit,
	pick,
	printable,
	splitByKeys,
	throwInternalError,
	type List,
	type evaluate,
	type listable
} from "@arktype/util"
import { BaseNode, type ConstraintNode, type Node } from "../base.js"
import {
	PropsGroup,
	type ExtraneousKeyBehavior,
	type ExtraneousKeyRestriction
} from "../constraints/props/props.js"
import type { Inner, MutableInner, Prerequisite, Schema } from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type { Scope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import { metaKeys, type BaseMeta, type declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import {
	constraintKeys,
	propKeys,
	type ConstraintKind,
	type IntersectionChildKind,
	type OpenNodeKind,
	type PropKind,
	type RefinementKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import type { DomainNode, DomainSchema } from "./domain.js"
import type { ProtoNode, ProtoSchema } from "./proto.js"
import { BaseType, defineRightwardIntersections, type Type } from "./type.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionInner = evaluate<
	BaseMeta & {
		domain?: DomainNode
		proto?: ProtoNode
	} & {
		[k in ConditionalIntersectionKey]?: conditionalInnerValueOfKey<k>
	}
>

export type IntersectionSchema<inferredBasis = any> = evaluate<
	BaseMeta & {
		domain?: DomainSchema
		proto?: ProtoSchema
	} & conditionalSchemaOf<inferredBasis>
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	normalizedSchema: IntersectionSchema
	inner: IntersectionInner
	reducibleTo: "intersection" | IntersectionBasisKind
	errorContext: {
		errors: readonly ArkTypeError[]
	}
	childKind: IntersectionChildKind
}>

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
				.map((schema) => ctx.$.node(kind, schema as never))
				.sort((l, r) => (l.innerId < r.innerId ? -1 : 1)) as never
		}
		const node = ctx.$.node(kind, input)
		return node.intersectionIsOpen ? [node] : (node as any)
	}

// 	readonly literalKeys = this.named.map((prop) => prop.key.name)
// 	readonly namedKeyOf = cached(() => node.unit(...this.literalKeys))
// 	readonly indexedKeyOf = cached(
// 		() =>
// 			new Type(
// 				this.indexed.flatMap((entry) => entry.key.branches),
// 				this.meta
// 			)
// 	)
// 	readonly keyof = cached(() => this.namedKeyOf().or(this.indexedKeyOf()))

// get(key: string | Type) {
// 	return typeof key === "string"
// 		? this.named.find((entry) => entry.value.branches)?.value
// 		: this.indexed.find((entry) => entry.key.equals(key))?.value
// }

const intersectIntersections = (
	reduced: IntersectionInner,
	raw: IntersectionInner,
	$: Scope
): Type | Disjoint => {
	// avoid treating adding instance keys as keys of lRoot, rRoot
	if (reduced instanceof IntersectionNode) reduced = reduced.inner
	if (raw instanceof IntersectionNode) raw = raw.inner

	const [reducedConstraintsInner, reducedRoot] = splitByKeys(
		reduced,
		constraintKeys
	)
	const [rawConstraintsInner, rawRoot] = splitByKeys(raw, constraintKeys)

	// since intersection with a left operand of unknown is leveraged for
	// reduction, check for the case where r is empty so we can preserve
	// metadata and save some time

	const root = isEmptyObject(reduced)
		? rawRoot
		: intersectRootKeys(reducedRoot, rawRoot)

	if (root instanceof Disjoint) return root

	const lConstraints = flattenConstraints(reducedConstraintsInner)
	const rConstraints = flattenConstraints(rawConstraintsInner)

	return intersectConstraints({
		root,
		l: lConstraints,
		r: rConstraints,
		types: [],
		$
	})
}

export class IntersectionNode<t = unknown, $ = any> extends BaseType<
	t,
	IntersectionDeclaration,
	$
> {
	static implementation: nodeImplementationOf<IntersectionDeclaration> =
		this.implement({
			hasAssociatedError: true,
			normalize: (schema) => schema,
			keys: {
				domain: {
					child: true,
					parse: intersectionChildKeyParser("domain")
				},
				proto: {
					child: true,
					parse: intersectionChildKeyParser("proto")
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
				exactLength: {
					child: true,
					parse: intersectionChildKeyParser("exactLength")
				},
				before: {
					child: true,
					parse: intersectionChildKeyParser("before")
				},
				after: {
					child: true,
					parse: intersectionChildKeyParser("after")
				},
				regex: {
					child: true,
					parse: intersectionChildKeyParser("regex")
				},
				predicate: {
					child: true,
					parse: intersectionChildKeyParser("predicate")
				},
				prop: {
					child: true,
					parse: intersectionChildKeyParser("prop")
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
			// leverage reduction logic from intersection and identity to ensure initial
			// parse result is reduced
			reduce: (inner, $) =>
				// we cast union out of the result here since that only occurs when intersecting two sequences
				// that cannot occur when reducing a single intersection schema using unknown
				intersectIntersections({}, inner, $) as Node<
					"intersection" | IntersectionBasisKind
				>,
			defaults: {
				description(node) {
					return node.children.length === 0
						? "unknown"
						: node.props?.description ??
								node.children.map((child) => child.description).join(" and ")
				},
				expected(source) {
					return "  • " + source.errors.map((e) => e.expected).join("\n  • ")
				},
				problem(ctx) {
					return `must be...\n${ctx.expected}\n(was ${printable(ctx.data)})`
				}
			},
			intersections: {
				intersection: intersectIntersections,
				...defineRightwardIntersections("intersection", (l, r, $) => {
					// if l is unknown, return r
					if (l.children.length === 0) return r

					const basis = l.basis?.intersect(r) ?? r

					return basis instanceof Disjoint
						? basis
						: l?.basis?.equals(basis)
						? // if the basis doesn't change, return the original intesection
						  l
						: // given we've already precluded l being unknown, the result must
						  // be an intersection with the new basis result integrated
						  $.node(
								"intersection",
								Object.assign(omit(l.inner, metaKeys), { [basis.kind]: basis }),
								{ prereduced: true }
						  )
				})
			}
		})

	readonly basis = this.domain ?? this.proto
	readonly refinements = this.children.filter(
		(node): node is Node<RefinementKind> => node.isRefinement()
	)
	readonly props = maybeCreatePropsGroup(this.inner, this.$)
	readonly traversables = conflatenateAll<
		Node<Exclude<IntersectionChildKind, PropKind>> | PropsGroup
	>(this.basis, this.refinements, this.props, this.predicate)
	readonly expression =
		this.props?.expression ||
		this.children.map((node) => node.nestableExpression).join(" & ") ||
		"unknown"

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

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.traversables.forEach((traversable) =>
				traversable instanceof BaseNode
					? js.check(traversable)
					: traversable.compile(js)
			)
			js.return(true)
			return
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

	rawKeyOf(): Type {
		return this.basis
			? this.props
				? this.basis.rawKeyOf().or(this.props.rawKeyOf())
				: this.basis.rawKeyOf()
			: this.props?.rawKeyOf() ?? this.$.keywords.never
	}
}

const maybeCreatePropsGroup = (inner: IntersectionInner, $: Scope) => {
	const propsInput = pick(inner, propKeys)
	return isEmptyObject(propsInput) ? undefined : new PropsGroup(propsInput, $)
}

type IntersectionRoot = Omit<IntersectionInner, ConstraintKind>

const intersectRootKeys = (
	l: IntersectionRoot,
	r: IntersectionRoot
): MutableInner<"intersection"> | Disjoint => {
	const result: IntersectionRoot = {}

	const lBasis = l.proto ?? l.domain
	const rBasis = r.proto ?? r.domain
	const resultBasis = lBasis
		? rBasis
			? lBasis.intersect(rBasis)
			: lBasis
		: rBasis
	if (resultBasis) {
		if (resultBasis instanceof Disjoint) {
			return resultBasis
		}
		if (resultBasis.kind === "domain" || resultBasis.kind === "proto") {
			result[resultBasis.kind] = resultBasis as never
		} else {
			return throwInternalError(
				`Unexpected intersection basis intersection ${resultBasis}`
			)
		}
	}
	if (l.onExtraneousKey || r.onExtraneousKey) {
		result.onExtraneousKey =
			l.onExtraneousKey === "throw" || r.onExtraneousKey === "throw"
				? "throw"
				: "prune"
	}
	return result
}

type ConstraintIntersectionState = {
	root: IntersectionRoot
	l: ConstraintNode[]
	r: ConstraintNode[]
	types: Type[]
	$: Scope
}

const intersectConstraints = (
	s: ConstraintIntersectionState
): Type | Disjoint => {
	if (!s.r.length) {
		let result: Type | Disjoint = s.$.node(
			"intersection",
			Object.assign(s.root, unflattenConstraints(s.l)),
			{ prereduced: true }
		)
		for (const type of s.types) {
			if (result instanceof Disjoint) {
				return result
			}
			result = type.intersect(result)
		}
		return result
	}
	const head = s.r.shift()!
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = s.l[i].intersect(head)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (!matched) {
			if (result.isType()) s.types.push(result)
			else s.l[i] = result
			matched = true
		} else if (!s.l.includes(result as never)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${result}`
			)
		}
	}
	if (!matched) {
		s.l.push(head)
	}

	head.impliedSiblings?.forEach((node) => appendUnique(s.r, node))
	return intersectConstraints(s)
}

const flattenConstraints = (inner: IntersectionInner): ConstraintNode[] => {
	const result = entriesOf(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<ConstraintNode>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence
				? -1
				: l.precedence > r.precedence
				? 1
				: l.innerId < r.innerId
				? -1
				: 1
		)

	return result
}

const unflattenConstraints = (
	constraints: List<ConstraintNode>
): IntersectionInner => {
	const inner: MutableInner<"intersection"> = {}
	for (const constraint of constraints) {
		if (constraint.intersectionIsOpen) {
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

export type constraintKindOf<t> = {
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
