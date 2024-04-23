import {
	append,
	appendUnique,
	type array,
	conflatenateAll,
	entriesOf,
	isArray,
	isEmptyObject,
	type listable,
	omit,
	pick,
	type show,
	splitByKeys,
	throwInternalError
} from "@arktype/util"
import {
	type ExtraneousKeyBehavior,
	type ExtraneousKeyRestriction,
	PropsGroup
} from "../constraints/props/props.js"
import type { Inner, MutableInner, NodeDef, Prerequisite } from "../kinds.js"
import type { Constraint, Node } from "../node.js"
import type { NodeParseContext } from "../parse.js"
import { RawSchema, type RawSchemaAttachments } from "../schema.js"
import type { RawSchemaScope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import { type BaseMeta, type declareNode, metaKeys } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import {
	type ConstraintKind,
	type IntersectionChildKind,
	type IntersectionContext,
	type OpenNodeKind,
	type PropKind,
	type RefinementKind,
	constraintKeys,
	implementNode,
	propKeys
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { hasArkKind, isNode } from "../shared/utils.js"
import type { DomainDef, DomainNode } from "./domain.js"
import type { ProtoDef, ProtoNode } from "./proto.js"
import { defineRightwardIntersections } from "./utils.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionInner = show<
	BaseMeta & {
		domain?: DomainNode
		proto?: ProtoNode
	} & {
		[k in ConditionalIntersectionKey]?: conditionalInnerValueOfKey<k>
	}
>

export type IntersectionDef<inferredBasis = any> = show<
	BaseMeta & {
		domain?: DomainDef
		proto?: ProtoDef
	} & conditionalSchemaOf<inferredBasis>
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	def: IntersectionDef
	normalizedDef: IntersectionDef
	inner: IntersectionInner
	reducibleTo: "intersection" | IntersectionBasisKind
	errorContext: {
		errors: readonly ArkTypeError[]
	}
	childKind: IntersectionChildKind
	attachments: IntersectionAttachments
}>

export interface IntersectionAttachments
	extends RawSchemaAttachments<IntersectionDeclaration> {
	basis: DomainNode | ProtoNode | null
	refinements: array<Node<RefinementKind>>
	props: PropsGroup | null
	traversables: array<
		Node<Exclude<IntersectionChildKind, PropKind>> | PropsGroup
	>
}

export class IntersectionNode extends RawSchema<IntersectionDeclaration> {
	basis = this.domain ?? this.proto ?? null
	refinements = this.children.filter((node): node is Node<RefinementKind> =>
		node.isRefinement()
	)
	props = maybeCreatePropsGroup(this.inner, this.$)
	traversables = conflatenateAll<
		Node<Exclude<IntersectionChildKind, PropKind>> | PropsGroup
	>(this.basis, this.refinements, this.props, this.predicate)

	expression =
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
			if (ctx.hasError()) return
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				this.refinements[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.hasError()) return
			}
			this.refinements.at(-1)!.traverseApply(data as never, ctx)
			if (ctx.hasError()) return
		}
		if (this.props) {
			this.props.traverseApply(data as never, ctx)
			if (ctx.hasError()) return
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				this.predicate[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.hasError()) return
			}
			this.predicate.at(-1)!.traverseApply(data as never, ctx)
		}
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.traversables.forEach((traversable) =>
				isNode(traversable) ? js.check(traversable) : traversable.compile(js)
			)
			js.return(true)
			return
		}

		const returnIfFail = () => js.if("ctx.hasError()", () => js.return())
		const returnIfFailFast = () =>
			js.if("ctx.failFast && ctx.hasError()", () => js.return())

		if (this.basis) {
			js.check(this.basis)
			// we only have to return conditionally if this is not the last check
			if (this.traversables.length > 1) returnIfFail()
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				js.check(this.refinements[i])
				returnIfFailFast()
			}
			js.check(this.refinements.at(-1)!)
			if (this.props || this.predicate) returnIfFail()
		}
		if (this.props) {
			this.props.compile(js)
			if (this.predicate) returnIfFail()
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				js.check(this.predicate[i])
				// since predicates can be chained, we have to fail immediately
				// if one fails
				returnIfFail()
			}
			js.check(this.predicate.at(-1)!)
		}
	}

	rawKeyOf(): RawSchema {
		return (
			this.basis ?
				this.props ?
					this.basis.rawKeyOf().or(this.props.rawKeyOf())
				:	this.basis.rawKeyOf()
			:	this.props?.rawKeyOf() ?? this.$.keywords.never.raw
		)
	}
}

const intersectionChildKeyParser =
	<kind extends IntersectionChildKind>(kind: kind) =>
	(
		def: listable<NodeDef<kind>>,
		ctx: NodeParseContext
	): intersectionChildInnerValueOf<kind> | undefined => {
		if (isArray(def)) {
			if (def.length === 0) {
				// Omit empty lists as input
				return
			}
			return def
				.map((schema) => ctx.$.node(kind, schema as never))
				.sort((l, r) => (l.innerId < r.innerId ? -1 : 1)) as never
		}
		const child = ctx.$.node(kind, def)
		return child.hasOpenIntersection() ? [child] : (child as any)
	}

const intersectIntersections = (
	reduced: IntersectionInner,
	raw: IntersectionInner,
	ctx: IntersectionContext
): RawSchema | Disjoint => {
	// avoid treating adding instance keys as keys of lRoot, rRoot
	if (hasArkKind(reduced, "schema") && reduced.hasKind("intersection"))
		return intersectIntersections(reduced.inner, raw, ctx)
	if (hasArkKind(raw, "schema") && raw.hasKind("intersection"))
		return intersectIntersections(reduced, raw.inner, ctx)

	const [reducedConstraintsInner, reducedRoot] = splitByKeys(
		reduced,
		constraintKeys
	)
	const [rawConstraintsInner, rawRoot] = splitByKeys(raw, constraintKeys)

	// since intersection with a left operand of unknown is leveraged for
	// reduction, check for the case where r is empty so we can preserve
	// metadata and save some time

	const root =
		isEmptyObject(reduced) ? rawRoot : (
			intersectRootKeys(reducedRoot, rawRoot, ctx)
		)

	if (root instanceof Disjoint) return root

	const lConstraints = flattenConstraints(reducedConstraintsInner)
	const rConstraints = flattenConstraints(rawConstraintsInner)

	return intersectConstraints({
		root,
		l: lConstraints,
		r: rConstraints,
		types: [],
		ctx
	})
}

export const intersectionImplementation =
	implementNode<IntersectionDeclaration>({
		kind: "intersection",
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
			intersectIntersections({}, inner, {
				$,
				invert: false,
				pipe: false
			}) as Node<"intersection" | IntersectionBasisKind>,
		defaults: {
			description: (node) =>
				node.children.length === 0 ?
					"unknown"
				:	node.props?.description ??
					node.children.map((child) => child.description).join(" and "),
			expected: (source) =>
				`  • ${source.errors.map((e) => e.expected).join("\n  • ")}`,
			problem: (ctx) => `must be...\n${ctx.expected}`
		},
		intersections: {
			intersection: intersectIntersections,
			...defineRightwardIntersections("intersection", (l, r, ctx) => {
				// if l is unknown, return r
				if (l.children.length === 0) return r

				const basis = l.basis ? intersectNodes(l.basis, r, ctx) : r

				return (
					basis instanceof Disjoint ? basis
					: l?.basis?.equals(basis) ?
						// if the basis doesn't change, return the original intesection
						l
						// given we've already precluded l being unknown, the result must
						// be an intersection with the new basis result integrated
					:	l.$.node(
							"intersection",
							Object.assign(omit(l.inner, metaKeys), {
								[basis.kind]: basis
							}),
							{ prereduced: true }
						)
				)
			})
		},
		construct: (self) => {
			const basis = self.domain ?? self.proto ?? null
			const refinements = self.children.filter(
				(node): node is Node<RefinementKind> => node.isRefinement()
			)
			const props = maybeCreatePropsGroup(self.inner, self.$)
			const traversables = conflatenateAll<
				Node<Exclude<IntersectionChildKind, PropKind>> | PropsGroup
			>(basis, refinements, props, self.predicate)

			return {
				basis,
				refinements,
				props,
				traversables,
				expression:
					props?.expression ||
					self.children.map((node) => node.nestableExpression).join(" & ") ||
					"unknown",
				traverseAllows: (data, ctx) =>
					traversables.every((traversable) =>
						traversable.traverseAllows(data as never, ctx)
					),
				traverseApply: (data, ctx) => {
					if (basis) {
						basis.traverseApply(data, ctx)
						if (ctx.hasError()) return
					}
					if (refinements.length) {
						for (let i = 0; i < refinements.length - 1; i++) {
							refinements[i].traverseApply(data as never, ctx)
							if (ctx.failFast && ctx.hasError()) return
						}
						refinements.at(-1)!.traverseApply(data as never, ctx)
						if (ctx.hasError()) return
					}
					if (props) {
						props.traverseApply(data as never, ctx)
						if (ctx.hasError()) return
					}
					if (self.predicate) {
						for (let i = 0; i < self.predicate.length - 1; i++) {
							self.predicate[i].traverseApply(data as never, ctx)
							if (ctx.failFast && ctx.hasError()) return
						}
						self.predicate.at(-1)!.traverseApply(data as never, ctx)
					}
				},
				compile(js) {
					if (js.traversalKind === "Allows") {
						this.traversables.forEach((traversable) =>
							isNode(traversable) ?
								js.check(traversable)
							:	traversable.compile(js)
						)
						js.return(true)
						return
					}

					const returnIfFail = () => js.if("ctx.hasError()", () => js.return())
					const returnIfFailFast = () =>
						js.if("ctx.failFast && ctx.hasError()", () => js.return())

					if (this.basis) {
						js.check(this.basis)
						// we only have to return conditionally if this is not the last check
						if (this.traversables.length > 1) returnIfFail()
					}
					if (this.refinements.length) {
						for (let i = 0; i < this.refinements.length - 1; i++) {
							js.check(this.refinements[i])
							returnIfFailFast()
						}
						js.check(this.refinements.at(-1)!)
						if (this.props || this.predicate) returnIfFail()
					}
					if (this.props) {
						this.props.compile(js)
						if (this.predicate) returnIfFail()
					}
					if (this.predicate) {
						for (let i = 0; i < this.predicate.length - 1; i++) {
							js.check(this.predicate[i])
							// since predicates can be chained, we have to fail immediately
							// if one fails
							returnIfFail()
						}
						js.check(this.predicate.at(-1)!)
					}
				},
				rawKeyOf() {
					return (
						this.basis ?
							this.props ?
								this.basis.rawKeyOf().or(this.props.rawKeyOf())
							:	this.basis.rawKeyOf()
						:	this.props?.rawKeyOf() ?? this.$.keywords.never.raw
					)
				}
			}
		}
	})

const maybeCreatePropsGroup = (inner: IntersectionInner, $: RawSchemaScope) => {
	const propsInput = pick(inner, propKeys)
	return isEmptyObject(propsInput) ? null : new PropsGroup(propsInput, $)
}

type IntersectionRoot = Omit<IntersectionInner, ConstraintKind>

const intersectRootKeys = (
	l: IntersectionRoot,
	r: IntersectionRoot,
	ctx: IntersectionContext
): MutableInner<"intersection"> | Disjoint => {
	const result: IntersectionRoot = {}

	const lBasis = l.proto ?? l.domain
	const rBasis = r.proto ?? r.domain
	const resultBasis =
		lBasis ?
			rBasis ? intersectNodes(lBasis, rBasis, ctx)
			:	lBasis
		:	rBasis
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
			l.onExtraneousKey === "throw" || r.onExtraneousKey === "throw" ?
				"throw"
			:	"prune"
	}
	return result
}

type ConstraintIntersectionState = {
	root: IntersectionRoot
	l: Constraint[]
	r: Constraint[]
	types: RawSchema[]
	ctx: IntersectionContext
}

const intersectConstraints = (
	s: ConstraintIntersectionState
): RawSchema | Disjoint => {
	if (!s.r.length) {
		let result: RawSchema | Disjoint = s.ctx.$.node(
			"intersection",
			Object.assign(s.root, unflattenConstraints(s.l)),
			{ prereduced: true }
		)
		for (const type of s.types) {
			if (result instanceof Disjoint) {
				return result
			}
			result = intersectNodes(type, result, s.ctx)
		}
		return result
	}
	const head = s.r.shift()!
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = intersectNodes(s.l[i], head, s.ctx)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (!matched) {
			if (result.isSchema()) s.types.push(result)
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

const flattenConstraints = (inner: IntersectionInner): Constraint[] => {
	const result = entriesOf(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<Constraint>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence ? -1
			: l.precedence > r.precedence ? 1
			: l.innerId < r.innerId ? -1
			: 1
		)

	return result
}

const unflattenConstraints = (
	constraints: array<Constraint>
): IntersectionInner => {
	const inner: MutableInner<"intersection"> = {}
	for (const constraint of constraints) {
		if (constraint.hasOpenIntersection()) {
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
	k extends OpenNodeKind ? listable<NodeDef<k> | Inner<k>>
	:	NodeDef<k> | Inner<k>

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind ? intersectionChildSchemaValueOf<k>
	:	ConditionalTerminalIntersectionSchema[k & ConditionalTerminalIntersectionKey]

type intersectionChildInnerValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? readonly Node<k>[] : Node<k>

type conditionalInnerValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind ? intersectionChildInnerValueOf<k>
	:	ConditionalTerminalIntersectionInner[k & ConditionalTerminalIntersectionKey]

export type conditionalSchemaOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalSchemaValueOfKey<k>
}
