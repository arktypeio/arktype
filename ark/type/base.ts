import {
	Callable,
	capitalize,
	includes,
	isArray,
	morph,
	printable,
	throwError,
	throwParseError,
	type Constructor,
	type Dict,
	type Entry,
	type Guardable,
	type Json,
	type JsonData,
	type PartialRecord,
	type conform,
	type evaluate,
	type listable
} from "@arktype/util"
import type { PredicateNode } from "./constraints/predicate.js"
import type { IndexNode } from "./constraints/props/index.js"
import type { PropNode } from "./constraints/props/prop.js"
import type { SequenceNode } from "./constraints/props/sequence.js"
import type { DivisorNode } from "./constraints/refinements/divisor.js"
import type { BoundNodesByKind } from "./constraints/refinements/kinds.js"
import type { RegexNode } from "./constraints/refinements/regex.js"
import type {
	Declaration,
	Inner,
	Schema,
	ioKindOf,
	reducibleKindOf
} from "./kinds.js"
import type { Resolutions, Scope } from "./scope.js"
import type { NodeCompiler } from "./shared/compile.js"
import {
	TraversalContext,
	pathToPropString,
	type TraverseAllows,
	type TraverseApply
} from "./shared/context.js"
import type {
	BaseAttachmentsOf,
	BaseErrorContext,
	BaseMeta,
	BaseNodeDeclaration
} from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import type { ArkResult } from "./shared/errors.js"
import {
	basisKinds,
	constraintKinds,
	discriminatingIntersectionKeys,
	precedenceOfKind,
	propKinds,
	refinementKinds,
	typeKinds,
	type BasisKind,
	type ConstraintKind,
	type NodeKind,
	type PropKind,
	type RefinementKind,
	type TypeKind,
	type UnknownIntersectionResult,
	type UnknownNodeImplementation,
	type nodeImplementationInputOf,
	type nodeImplementationOf
} from "./shared/implement.js"
import { inferred } from "./shared/inference.js"
import type { DomainNode } from "./types/domain.js"
import type { IntersectionNode } from "./types/intersection.js"
import type {
	MorphNode,
	distill,
	extractIn,
	extractOut
} from "./types/morph.js"
import type { ProtoNode } from "./types/proto.js"
import type { Type } from "./types/type.js"
import type { UnionNode } from "./types/union.js"
import type { UnitNode } from "./types/unit.js"

export interface BaseAttachments {
	alias?: string
	readonly kind: NodeKind
	readonly reference: string
	readonly inner: Record<string, any>
	readonly entries: readonly Entry<string>[]
	readonly json: object
	readonly typeJson: object
	readonly collapsibleJson: JsonData
	readonly children: UnknownNode[]
	readonly innerId: string
	readonly typeId: string
	readonly $: Scope
}

export interface NarrowedAttachments<d extends BaseNodeDeclaration>
	extends BaseAttachments {
	kind: d["kind"]
	inner: d["inner"]
	json: Json
	typeJson: Json
	collapsibleJson: JsonData
	children: Node<d["childKind"]>[]
}

export type NodeSubclass<d extends BaseNodeDeclaration = BaseNodeDeclaration> =
	{
		new (attachments: never): BaseNode<any, d>
		readonly implementation: nodeImplementationOf<d>
	}

export const isNode = (value: unknown): value is UnknownNode =>
	value instanceof BaseNode

export type UnknownNode = BaseNode<any, BaseNodeDeclaration>

type subclassKind<self> = self extends Constructor<{
	kind: infer kind extends NodeKind
}>
	? kind
	: never

type subclassDeclaration<self> = Declaration<subclassKind<self>>

export abstract class BaseNode<
	t,
	d extends BaseNodeDeclaration
> extends Callable<
	(data: unknown) => ArkResult<distill<extractOut<t>>>,
	BaseAttachmentsOf<d>
> {
	declare infer: distill<extractOut<t>>;
	declare [inferred]: t

	protected static implement<self>(
		this: self,
		implementation: nodeImplementationInputOf<subclassDeclaration<self>>
	): nodeImplementationOf<subclassDeclaration<self>>
	protected static implement(_: never): any {
		const implementation: UnknownNodeImplementation = _
		if (implementation.hasAssociatedError) {
			implementation.defaults.expected ??= (ctx) =>
				"description" in ctx
					? (ctx.description as string)
					: implementation.defaults.description(ctx)
			implementation.defaults.actual ??= (data) => printable(data)
			implementation.defaults.problem ??= (ctx) =>
				`must be ${ctx.expected}${ctx.actual ? ` (was ${ctx.actual})` : ""}`
			implementation.defaults.message ??= (ctx) => {
				if (ctx.path.length === 0) {
					return capitalize(ctx.problem)
				}
				const problemWithLocation = `${pathToPropString(ctx.path)} ${
					ctx.problem
				}`
				if (problemWithLocation[0] === "[") {
					// clarify paths like [1], [0][1], and ["key!"] that could be confusing
					return `Value at ${problemWithLocation}`
				}
				return problemWithLocation
			}
		}
		return implementation
	}

	protected readonly impl: UnknownNodeImplementation = (this.constructor as any)
		.implementation
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly includesContextDependentPredicate: boolean =
		// if a predicate accepts exactly one arg, we can safely skip passing context
		(this.hasKind("predicate") && this.inner.predicate.length !== 1) ||
		this.children.some((child) => child.includesContextDependentPredicate)
	readonly referencesByName: Record<string, UnknownNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesByName),
		{}
	)
	readonly references: readonly UnknownNode[] = Object.values(
		this.referencesByName
	)
	readonly contributesReferencesByName: Record<string, UnknownNode>
	readonly contributesReferences: readonly UnknownNode[]
	readonly precedence = precedenceOfKind(this.kind)
	jit = false

	constructor(public attachments: BaseAttachments) {
		super(
			(data) => {
				const ctx = new TraversalContext(data, this.$.config)
				this.traverseApply(data, ctx)
				if (ctx.currentErrors.length === 0) {
					return { out: data } as any
				}
				return { errors: ctx.currentErrors }
			},
			{ attach: attachments as never }
		)
		this.contributesReferencesByName =
			this.reference in this.referencesByName
				? this.referencesByName
				: { ...this.referencesByName, [this.reference]: this as never }
		this.contributesReferences = Object.values(this.contributesReferencesByName)
	}

	private descriptionCache?: string
	get description(): string {
		this.descriptionCache ??=
			this.inner.description ??
			this.$.config[this.kind].description?.(this as never)
		return this.descriptionCache
	}

	allows = (data: d["prerequisite"]): data is distill<extractIn<t>> => {
		const ctx = new TraversalContext(data, this.$.config)
		return this.traverseAllows(data as never, ctx)
	}

	parse(data: d["prerequisite"]): ArkResult<distill<extractOut<t>>> {
		return this(data)
	}

	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract traverseApply: TraverseApply<d["prerequisite"]>
	abstract compile(js: NodeCompiler): void
	abstract expression: string

	private inCache?: UnknownNode;
	get in(): Node<ioKindOf<d["kind"]>, extractIn<t>> {
		this.inCache ??= this.getIo("in")
		return this.inCache as never
	}

	private outCache?: UnknownNode
	get out(): Node<ioKindOf<d["kind"]>, extractOut<t>> {
		this.outCache ??= this.getIo("out")
		return this.outCache as never
	}

	private getIo(kind: "in" | "out"): UnknownNode {
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
				const childValue = v as listable<UnknownNode>
				ioInner[k] = isArray(childValue)
					? childValue.map((child) => child[kind])
					: childValue[kind]
			} else {
				ioInner[k] = v
			}
		}
		return this.$.node(this.kind, ioInner)
	}

	protected createErrorContext<from>(
		from: from
	): evaluate<BaseErrorContext<d["kind"]> & from> {
		return Object.freeze({
			code: this.kind,
			description: this.description,
			...from
		}) as never
	}

	toJSON(): Json {
		return this.json
	}

	equals(other: UnknownNode): boolean {
		return this.typeId === other.typeId
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isConstraint(): this is ConstraintNode {
		return includes(constraintKinds, this.kind)
	}

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isProp(): this is Node<PropKind> {
		return includes(propKinds, this.kind)
	}

	isType(): this is Type {
		return includes(typeKinds, this.kind)
	}

	toString(): string {
		return this.expression
	}

	hasUnit<value>(value: unknown): this is UnitNode<value> {
		return this.hasKind("unit") && this.allows(value)
	}

	get intersectionIsOpen(): d["intersectionIsOpen"] {
		return this.impl.intersectionIsOpen as never
	}

	get nestableExpression(): string {
		return this.children.length > 1 &&
			this.children.some((child) => !child.isBasis && !child.isProp())
			? `(${this.expression})`
			: this.expression
	}

	private static intersectionCache: PartialRecord<
		string,
		UnknownIntersectionResult
	> = {}
	protected intersectInternal(
		this: UnknownNode,
		r: UnknownNode
	): UnknownIntersectionResult {
		const lrCacheKey = `${this.typeId}&${r.typeId}`
		if (BaseNode.intersectionCache[lrCacheKey]) {
			return BaseNode.intersectionCache[lrCacheKey]!
		}
		const rlCacheKey = `${r.typeId}&${this.typeId}`
		if (BaseNode.intersectionCache[rlCacheKey]) {
			// if the cached result was a Disjoint and the operands originally
			// appeared in the opposite order, we need to invert it to match
			const rlResult = BaseNode.intersectionCache[rlCacheKey]!
			const lrResult =
				rlResult instanceof Disjoint ? rlResult.invert() : rlResult
			// add the lr result to the cache directly to bypass this check in the future
			BaseNode.intersectionCache[lrCacheKey] = lrResult
			return lrResult
		}

		if (this.equals(r as never)) {
			return this as never
		}

		const leftmostKind = this.precedence < r.precedence ? this.kind : r.kind
		const implementation =
			this.impl.intersections[r.kind] ?? r.impl.intersections[this.kind]

		let result =
			implementation === undefined
				? // should be two ConstraintNodes that have no relation
				  // this could also happen if a user directly intersects a Type and a ConstraintNode,
				  // but that is not allowed by the external function signature
				  null
				: leftmostKind === this.kind
				? implementation(this, r, this.$)
				: implementation(r, this, this.$)

		if (result instanceof BaseNode) {
			// if the result equals one of the operands, preserve its metadata by
			// returning the original reference
			if (this.equals(result)) result = this as never
			else if (r.equals(result)) result = r as never
		}

		BaseNode.intersectionCache[lrCacheKey] = result
		return result
	}

	firstReference<narrowed>(
		filter: Guardable<UnknownNode, conform<narrowed, UnknownNode>>
	): narrowed | undefined {
		return this.references.find(filter as never) as never
	}

	firstReferenceOrThrow<narrowed extends UnknownNode>(
		filter: Guardable<UnknownNode, narrowed>
	): narrowed {
		return (
			this.firstReference(filter) ??
			throwError(
				`${this.reference} had no references matching predicate ${filter}`
			)
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
			throwError(`${this.reference} had no ${kind} references`)
		)
	}

	bindScope<resolutions extends Resolutions>(
		$: Scope<resolutions>
	): Node<d["kind"], t, resolutions> {
		if (this.$ === $) return this as never
		return new (this.constructor as any)({ ...this.attachments, $ })
	}

	transform(
		mapper: DeepNodeTransformation,
		shouldTransform: (node: UnknownNode) => boolean
	): Node<reducibleKindOf<this["kind"]>> {
		if (!shouldTransform(this as never)) {
			return this as never
		}
		const innerWithTransformedChildren = morph(this.inner as Dict, (k, v) => [
			k,
			this.impl.keys[k].child
				? isArray(v)
					? v.map((node) =>
							(node as UnknownNode).transform(mapper, shouldTransform)
					  )
					: (v as UnknownNode).transform(mapper, shouldTransform)
				: v
		])
		return this.$.parse(
			this.kind,
			mapper(this.kind, innerWithTransformedChildren as never) as never
		) as never
	}

	configureShallowDescendants(configOrDescription: BaseMeta | string): this {
		const config: BaseMeta =
			typeof configOrDescription === "string"
				? { description: configOrDescription }
				: (configOrDescription as never)
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

interface NodesByKind<t = any, $ = any> extends BoundNodesByKind {
	union: UnionNode<t, $>
	morph: MorphNode<t, $>
	intersection: IntersectionNode<t, $>
	unit: UnitNode<t, $>
	proto: ProtoNode<t, $>
	domain: DomainNode<t, $>
	divisor: DivisorNode
	regex: RegexNode
	predicate: PredicateNode
	prop: PropNode
	index: IndexNode
	sequence: SequenceNode
}

export type Node<kind extends NodeKind, t = any, $ = any> = NodesByKind<
	t,
	$
>[kind]

export type TypeSchema<kind extends TypeKind = TypeKind> = Schema<kind>

export const typeKindOfSchema = (schema: unknown): TypeKind => {
	switch (typeof schema) {
		case "string":
			return "domain"
		case "function":
			return "proto"
		case "object":
			// throw at end of function
			if (schema === null) break

			if (isNode(schema) && schema.isType()) return schema.kind

			if ("morphs" in schema) return "morph"

			if ("branches" in schema || isArray(schema)) return "union"

			if ("unit" in schema) return "unit"

			const schemaKeys = Object.keys(schema)

			if (
				schemaKeys.length === 0 ||
				schemaKeys.some((k) => k in discriminatingIntersectionKeys)
			)
				return "intersection"
			if ("proto" in schema) return "proto"
			if ("domain" in schema) return "domain"
	}
	return throwParseError(`${printable(schema)} is not a valid type schema`)
}

export type ConstraintNode<kind extends ConstraintKind = ConstraintKind> =
	Node<kind>
