import {
	DynamicBase,
	capitalize,
	includes,
	isArray,
	morph,
	printable,
	throwError,
	type Constructor,
	type Dict,
	type Entry,
	type Guardable,
	type Json,
	type JsonData,
	type PartialRecord,
	type entriesOf,
	type evaluate,
	type listable
} from "@arktype/util"
import type { PredicateNode } from "./constraints/predicate.js"
import type { IndexNode } from "./constraints/props/index.js"
import type { OptionalNode } from "./constraints/props/optional.js"
import type { RequiredNode } from "./constraints/props/required.js"
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
import type { ScopeNode } from "./scope.js"
import type { NodeCompiler } from "./shared/compile.js"
import {
	TraversalContext,
	pathToPropString,
	type TraverseAllows,
	type TraverseApply
} from "./shared/context.js"
import type {
	BaseExpectedContext,
	BaseMeta,
	BaseNodeDeclaration,
	attachmentsOf,
	requireDescriptionIfPresent
} from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import type { ArkResult } from "./shared/errors.js"
import {
	basisKinds,
	constraintKinds,
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
	type UnknownNodeImplementation,
	type UnknownNodeIntersectionResult,
	type nodeImplementationInputOf,
	type nodeImplementationOf
} from "./shared/implement.js"
import { inferred } from "./shared/inference.js"
import type { inferIntersection } from "./shared/intersections.js"
import type { DomainNode } from "./types/domain.js"
import type { IntersectionNode } from "./types/intersection.js"
import type {
	MorphNode,
	distill,
	extractIn,
	extractOut
} from "./types/morph.js"
import type { ProtoNode } from "./types/proto.js"
import type { typeKindRightOf } from "./types/type.js"
import type { UnionNode } from "./types/union.js"
import type { UnitNode } from "./types/unit.js"

export interface BaseAttachments {
	alias?: string
	readonly kind: NodeKind
	readonly name: string
	readonly inner: Record<string, any>
	readonly entries: readonly Entry[]
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: JsonData
	readonly children: Node[]
	readonly innerId: string
	readonly typeId: string
	readonly $: ScopeNode
}

export interface NarrowedAttachments<d extends BaseNodeDeclaration>
	extends BaseAttachments {
	kind: d["kind"]
	inner: d["inner"]
	entries: entriesOf<d["inner"]>
	children: Node<d["childKind"]>[]
}

export type NodeSubclass<d extends BaseNodeDeclaration = BaseNodeDeclaration> =
	{
		new (attachments: never): BaseNode<any, d, any>
		readonly implementation: nodeImplementationOf<d>
	}

export const isNode = (value: unknown): value is Node =>
	value instanceof BaseNode

export type UnknownNode = BaseNode<
	any,
	BaseNodeDeclaration,
	NodeSubclass<BaseNodeDeclaration>
>

type subclassKind<self> = self extends Constructor<{
	kind: infer kind extends NodeKind
}>
	? kind
	: never

type subclassDeclaration<self> = Declaration<subclassKind<self>>

export abstract class BaseNode<
	t,
	d extends BaseNodeDeclaration,
	// subclass doesn't affect the class's type, but rather is used to validate
	// the correct static implementation
	subclass extends NodeSubclass<d>
> extends DynamicBase<attachmentsOf<d>> {
	declare infer: extractOut<t>;
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
	readonly referencesByName: Record<string, Node> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesByName),
		{}
	)
	readonly references: readonly Node[] = Object.values(this.referencesByName)
	readonly contributesReferencesByName: Record<string, Node>
	readonly contributesReferences: readonly Node[]
	readonly precedence = precedenceOfKind(this.kind)
	jit = false
	// use declare here to ensure description from attachments isn't overwritten
	declare readonly description: string

	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<typeKindRightOf<"union">>[]

	constructor(attachments: BaseAttachments) {
		super(attachments as never)
		this.contributesReferencesByName =
			this.name in this.referencesByName
				? this.referencesByName
				: { ...this.referencesByName, [this.name]: this as never }
		this.contributesReferences = Object.values(this.contributesReferencesByName)
		this.description ??= this.$.config[this.kind].description(
			this.inner as never
		)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
	}

	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract traverseApply: TraverseApply<d["prerequisite"]>
	abstract compile(js: NodeCompiler): void

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
		for (const [k, v] of this.entries as readonly Entry<string>[]) {
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
		return this.$.parse(this.kind, ioInner) as never
	}

	protected createExpectedContext<from>(
		from: from
	): evaluate<
		BaseExpectedContext<d["kind"]> & requireDescriptionIfPresent<from>
	> {
		return Object.freeze({
			...from,
			code: this.kind,
			description: this.description
		}) as never
	}

	toJSON() {
		return this.json
	}

	equals(other: Node) {
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

	isType(): this is TypeNode {
		return includes(typeKinds, this.kind)
	}

	toString() {
		return this.description
	}

	private static intersectionCache: PartialRecord<
		string,
		UnknownNodeIntersectionResult
	> = {}
	intersect<r extends Node>(
		r: r
	):
		| TypeNode<
				// intersectType<this["kind"], r["kind"]>,
				inferIntersection<this["infer"], r["infer"]>
		  >
		| Disjoint
	intersect(this: UnknownNode, other: Node): UnknownNodeIntersectionResult {
		// Node works better for subclasses but internally we want to treat it as UnknownNode
		const r = other as UnknownNode
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
			// TODO: meta
			return this as never
		}

		const leftmostKind = this.precedence < r.precedence ? this.kind : r.kind
		const implementation =
			this.impl.intersections[r.kind] ?? r.impl.intersections[this.kind]

		const rawResult =
			implementation === undefined
				? // should be two ConstraintNodes that have no relation
				  // this could also happen if a user directly intersects a TypeNode and a ConstraintNode,
				  // but that is not allowed by the external function signature
				  null
				: leftmostKind === this.kind
				? implementation(this, r, this.$)
				: implementation(r, this, this.$)

		let instantiatedResult: UnknownNodeIntersectionResult =
			rawResult === null || rawResult instanceof Disjoint
				? rawResult
				: isArray(rawResult)
				? // arrays represent a constraint union of a branching intersection kind like sequence
				  rawResult.map((inner) => this.$.parse(this.kind, inner as never))
				: rawResult instanceof BaseNode
				? // unlike parsing, intersection allows different node kinds to be returned,
				  // so avoid parsing an instantiated Node here
				  rawResult
				: this.$.parse(leftmostKind, rawResult as never, { prereduced: true })

		if (instantiatedResult instanceof BaseNode) {
			// if the result equals one of the operands, preserve its metadata by
			// returning the original reference
			if (this.equals(instantiatedResult)) instantiatedResult = this as never
			else if (r.equals(instantiatedResult)) instantiatedResult = r as never
		}

		BaseNode.intersectionCache[lrCacheKey] = instantiatedResult
		return instantiatedResult
	}

	allows = (data: d["prerequisite"]): data is distill<extractIn<t>> => {
		const ctx = new TraversalContext(data, this.$.config)
		return this.traverseAllows(data as never, ctx)
	}

	apply(data: d["prerequisite"]): ArkResult<distill<extractOut<t>>> {
		const ctx = new TraversalContext(data, this.$.config)
		this.traverseApply(data, ctx)
		if (ctx.currentErrors.length === 0) {
			return { out: data } as any
		}
		return { errors: ctx.currentErrors }
	}

	constrain<constraintKind extends ConstraintKind>(
		kind: constraintKind,
		input: Schema<constraintKind>
	): TypeNode<this["infer"]> {
		const constraint = this.$.parse(kind, input)
		return this.and(
			this.$.parse("intersection", { [kind]: constraint })
		) as never
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	and<r extends TypeNode>(
		r: r
	): TypeNode<
		// intersectType<this["kind"], r["kind"]>,
		inferIntersection<this["infer"], r["infer"]>
	> {
		const result = this.intersect(r as never)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<r extends TypeNode>(
		r: r
	): Node<"union" | d["kind"] | r["kind"], t | r["infer"]> {
		return this.$.parseBranches(
			...this.branches,
			...(r.branches as any)
		) as never
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	get<key extends PropertyKey>(...path: readonly (key | TypeNode<key>)[]) {
		return this
	}

	extract(other: TypeNode) {
		return this.$.parseRoot(
			"union",
			this.branches.filter((branch) => branch.extends(other))
		)
	}

	exclude(other: TypeNode) {
		return this.$.parseRoot(
			"union",
			this.branches.filter((branch) => !branch.extends(other))
		)
	}

	array(): IntersectionNode<t[]> {
		return this.$.parseRoot(
			"intersection",
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	extends<other extends TypeNode>(other: other) {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	firstReference<narrowed extends Node>(
		filter: Guardable<Node, narrowed>
	): narrowed | undefined {
		return this.references.find(filter as never)
	}

	firstReferenceOrThrow<narrowed extends Node>(
		filter: Guardable<Node, narrowed>
	): narrowed {
		return (
			this.firstReference(filter) ??
			throwError(`${this.name} had no references matching predicate ${filter}`)
		)
	}

	firstReferenceOfKind<kind extends NodeKind>(
		kind: kind
	): Node<kind> | undefined {
		return this.firstReference((node) => node.kind === kind)
	}

	firstReferenceOfKindOrThrow<kind extends NodeKind>(kind: kind): Node<kind> {
		return (
			this.firstReference((node) => node.kind === kind) ??
			throwError(`${this.name} had no ${kind} references`)
		)
	}

	transform(
		mapper: DeepNodeTransformation,
		shouldTransform: (node: Node) => boolean
	): Node<reducibleKindOf<this["kind"]>> {
		if (!shouldTransform(this as never)) {
			return this as never
		}
		const innerWithTransformedChildren = morph(this.inner as Dict, (k, v) => [
			k,
			this.impl.keys[k].child
				? isArray(v)
					? v.map((node) => (node as Node).transform(mapper, shouldTransform))
					: (v as Node).transform(mapper, shouldTransform)
				: v
		])
		return this.$.parse(
			this.kind,
			mapper(this.kind, innerWithTransformedChildren as never) as never
		)
	}

	configureShallowDescendants(configOrDescription: BaseMeta | string): this {
		const config: BaseMeta =
			typeof configOrDescription === "string"
				? { description: configOrDescription }
				: (configOrDescription as never)
		return this.transform(
			(kind, inner) => ({ ...inner, ...config }),
			(node) => node.isProp()
		) as never
	}
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	inner: Inner<kind>
) => Inner<kind>

interface NodesByKind<t = any> extends BoundNodesByKind {
	union: UnionNode<t>
	morph: MorphNode<t>
	intersection: IntersectionNode<t>
	unit: UnitNode<t>
	proto: ProtoNode<t>
	domain: DomainNode<t>
	divisor: DivisorNode
	regex: RegexNode
	predicate: PredicateNode
	required: RequiredNode
	optional: OptionalNode
	index: IndexNode
	sequence: SequenceNode
}

export type Node<
	kind extends NodeKind = NodeKind,
	t = any
> = NodesByKind<t>[kind]

export type TypeNode<t = any, kind extends TypeKind = TypeKind> = Node<kind, t>

export type TypeSchema<kind extends TypeKind = TypeKind> = Schema<kind>

export type ConstraintNode<kind extends ConstraintKind = ConstraintKind> =
	Node<kind>
