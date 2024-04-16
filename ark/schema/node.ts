import {
	Callable,
	type Dict,
	type Guardable,
	type Json,
	type PartialRecord,
	type conform,
	flatMorph,
	includes,
	isArray,
	type listable,
	throwError
} from "@arktype/util"
import type { RawConstraint } from "./constraints/constraint.js"
import type { PredicateNode } from "./constraints/predicate.js"
import type { IndexNode } from "./constraints/props/index.js"
import type { PropNode } from "./constraints/props/prop.js"
import type { SequenceNode } from "./constraints/props/sequence.js"
import type { DivisorNode } from "./constraints/refinements/divisor.js"
import type { BoundNodesByKind } from "./constraints/refinements/kinds.js"
import type { RegexNode } from "./constraints/refinements/regex.js"
import {
	type Inner,
	type NodeDef,
	nodeImplementationsByKind,
	type reducibleKindOf
} from "./kinds.js"
import type { RawSchema, Schema } from "./schema.js"
import type { DomainNode } from "./schemas/domain.js"
import type { IntersectionNode } from "./schemas/intersection.js"
import type { MorphNode } from "./schemas/morph.js"
import type { ProtoNode } from "./schemas/proto.js"
import type { UnionNode } from "./schemas/union.js"
import type { UnitNode } from "./schemas/unit.js"
import type {
	BaseMeta,
	RawNodeDeclaration,
	attachmentsOf
} from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import type { ArkResult } from "./shared/errors.js"
import {
	type BasisKind,
	type NodeKind,
	type OpenNodeKind,
	type PropKind,
	type RefinementKind,
	type SchemaKind,
	type UnknownAttachments,
	type UnknownIntersectionResult,
	basisKinds,
	constraintKinds,
	precedenceOfKind,
	propKinds,
	refinementKinds,
	schemaKinds
} from "./shared/implement.js"
import { TraversalContext } from "./shared/traversal.js"

export type UnknownNode = RawNode | Schema

const nodeCountsByPrefix: PartialRecord<string, number> = {}

export class RawNode<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out d extends RawNodeDeclaration = RawNodeDeclaration
> extends Callable<(data: d["prerequisite"]) => ArkResult, attachmentsOf<d>> {
	constructor(public attachments: UnknownAttachments) {
		const prefix = attachments?.alias ?? attachments.kind
		nodeCountsByPrefix[prefix] ??= 0
		const name = `${prefix}${++nodeCountsByPrefix[prefix]!}`
		super(
			(data: any): ArkResult => {
				if (
					!this.includesMorph &&
					!this.includesContextDependentPredicate &&
					this.allows(data)
				) {
					return { data, out: data }
				}
				const ctx = new TraversalContext(data, this.$.resolvedConfig)
				this.traverseApply(data, ctx)
				return ctx.finalize()
			},
			{ attach: attachments as never, name }
		)
		this.contributesReferencesByName =
			this.name in this.referencesByName ?
				this.referencesByName
			:	{ ...this.referencesByName, [this.name]: this as never }
		this.contributesReferences = Object.values(this.contributesReferencesByName)
	}

	protected readonly impl = nodeImplementationsByKind[this.kind]
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly includesContextDependentPredicate: boolean =
		// if a predicate accepts exactly one arg, we can safely skip passing context
		(this.hasKind("predicate") && this.inner.predicate.length !== 1) ||
		this.children.some((child) => child.includesContextDependentPredicate)
	readonly referencesByName: Record<string, RawNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesByName),
		{}
	)
	readonly references: readonly RawNode[] = Object.values(this.referencesByName)
	readonly contributesReferencesByName: Record<string, RawNode>
	readonly contributesReferences: readonly RawNode[]
	readonly precedence = precedenceOfKind(this.kind)
	jit = false

	allows = (data: d["prerequisite"]): boolean => {
		const ctx = new TraversalContext(data, this.$.resolvedConfig)
		return this.traverseAllows(data as never, ctx)
	}

	traverse(data: d["prerequisite"]): ArkResult {
		return this(data)
	}

	#inCache?: RawNode;
	get in(): RawNode {
		this.#inCache ??= this.#getIo("in")
		return this.#inCache as never
	}

	#outCache?: RawNode
	get out(): RawNode {
		this.#outCache ??= this.#getIo("out")
		return this.#outCache as never
	}

	#getIo(kind: "in" | "out"): RawNode {
		if (!this.includesMorph) {
			return this as never
		}
		const ioInner: Record<any, unknown> = {}
		for (const [k, v] of this.entries) {
			const keyDefinition = this.impl.keys[k]
			if (keyDefinition.meta) {
				continue
			}
			if (keyDefinition.child) {
				const childValue = v as listable<RawNode>
				ioInner[k] =
					isArray(childValue) ?
						childValue.map((child) => child[kind])
					:	childValue[kind]
			} else {
				ioInner[k] = v
			}
		}
		return this.$.node(this.kind, ioInner)
	}

	toJSON(): Json {
		return this.json
	}

	equals(other: UnknownNode): boolean
	equals(other: RawNode): boolean {
		return this.typeId === other.typeId
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isConstraint(): this is Constraint {
		return includes(constraintKinds, this.kind)
	}

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isProp(): this is Node<PropKind> {
		return includes(propKinds, this.kind)
	}

	isSchema(): this is RawSchema {
		return includes(schemaKinds, this.kind)
	}

	hasUnit<value>(value: unknown): this is UnitNode & { unit: value } {
		return this.hasKind("unit") && this.allows(value)
	}

	hasOpenIntersection(): this is Node<OpenNodeKind> {
		return this.impl.intersectionIsOpen as never
	}

	get nestableExpression(): string {
		return (
				this.children.length > 1 &&
					this.children.some((child) => !child.isBasis && !child.isProp())
			) ?
				`(${this.expression})`
			:	this.expression
	}

	private static intersectionCache: PartialRecord<
		string,
		UnknownIntersectionResult
	> = {}
	protected intersectInternal(r: UnknownNode): UnknownIntersectionResult
	protected intersectInternal(
		this: RawNode,
		r: RawNode
	): UnknownIntersectionResult {
		const lrCacheKey = `${this.typeId}&${r.typeId}`
		if (RawNode.intersectionCache[lrCacheKey]) {
			return RawNode.intersectionCache[lrCacheKey]!
		}
		const rlCacheKey = `${r.typeId}&${this.typeId}`
		if (RawNode.intersectionCache[rlCacheKey]) {
			// if the cached result was a Disjoint and the operands originally
			// appeared in the opposite order, we need to invert it to match
			const rlResult = RawNode.intersectionCache[rlCacheKey]!
			const lrResult =
				rlResult instanceof Disjoint ? rlResult.invert() : rlResult
			// add the lr result to the cache directly to bypass this check in the future
			RawNode.intersectionCache[lrCacheKey] = lrResult
			return lrResult
		}

		if (this.equals(r as never)) {
			return this as never
		}

		const leftmostKind = this.precedence < r.precedence ? this.kind : r.kind
		const implementation =
			this.impl.intersections[r.kind] ?? r.impl.intersections[this.kind]

		let result =
			implementation === undefined ?
				// should be two ConstraintNodes that have no relation
				// this could also happen if a user directly intersects a Type and a ConstraintNode,
				// but that is not allowed by the external function signature
				null
			: leftmostKind === this.kind ? implementation(this, r, this.$)
			: implementation(r, this, this.$)

		if (result instanceof RawNode) {
			// if the result equals one of the operands, preserve its metadata by
			// returning the original reference
			if (this.equals(result)) result = this as never
			else if (r.equals(result)) result = r as never
		}

		RawNode.intersectionCache[lrCacheKey] = result
		return result
	}

	firstReference<narrowed>(
		filter: Guardable<RawNode, conform<narrowed, RawNode>>
	): narrowed | undefined {
		return this.references.find(filter as never) as never
	}

	firstReferenceOrThrow<narrowed extends RawNode>(
		filter: Guardable<RawNode, narrowed>
	): narrowed {
		return (
			this.firstReference(filter) ??
			throwError(`${this.name} had no references matching predicate ${filter}`)
		)
	}

	firstReferenceOfKind<kind extends NodeKind>(
		kind: kind
	): Node<kind> | undefined {
		return this.firstReference((node): node is Node<kind> => node.kind === kind)
	}

	firstReferenceOfKindOrThrow<kind extends NodeKind>(kind: kind): Node<kind> {
		return (
			this.firstReference((node) => node.kind === kind) ??
			throwError(`${this.name} had no ${kind} references`)
		)
	}

	transform(
		mapper: DeepNodeTransformation,
		shouldTransform: (node: RawNode) => boolean
	): Node<reducibleKindOf<this["kind"]>> {
		if (!shouldTransform(this as never)) {
			return this as never
		}
		const innerWithTransformedChildren = flatMorph(
			this.inner as Dict,
			(k, v) => [
				k,
				this.impl.keys[k].child ?
					isArray(v) ?
						v.map((node) =>
							(node as RawNode).transform(mapper, shouldTransform)
						)
					:	(v as RawNode).transform(mapper, shouldTransform)
				:	v
			]
		)
		return this.$.node(
			this.kind,
			mapper(this.kind, innerWithTransformedChildren as never) as never
		) as never
	}

	configureShallowDescendants(configOrDescription: BaseMeta | string): this {
		const config: BaseMeta =
			typeof configOrDescription === "string" ?
				{ description: configOrDescription }
			:	(configOrDescription as never)
		return this.transform(
			(kind, inner) => ({ ...inner, ...config }),
			(node) => !node.isProp()
		) as never
	}
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	inner: Inner<kind>
) => Inner<kind>

interface NodesByKind extends BoundNodesByKind {
	union: UnionNode
	morph: MorphNode
	intersection: IntersectionNode
	unit: UnitNode
	proto: ProtoNode
	domain: DomainNode
	divisor: DivisorNode
	regex: RegexNode
	predicate: PredicateNode
	prop: PropNode
	index: IndexNode
	sequence: SequenceNode
}

export type Node<kind extends NodeKind> = NodesByKind[kind]

export type SchemaDef<kind extends SchemaKind = SchemaKind> = NodeDef<kind>

export type Constraint = RawConstraint
