import {
	DynamicBase,
	capitalize,
	includes,
	isArray,
	map,
	printable,
	type Constructor,
	type Dict,
	type Entry,
	type Json,
	type JsonData,
	type entriesOf,
	type listable
} from "@arktype/util"
import type {
	Declaration,
	Inner,
	Schema,
	ioKindOf,
	reducibleKindOf
} from "./kinds.js"
import type {
	AfterNode,
	BeforeNode,
	MaxLengthNode,
	MaxNode,
	MinLengthNode,
	MinNode
} from "./refinements/bounds.js"
import type { DivisorNode } from "./refinements/divisor.js"
import type { IndexNode } from "./refinements/index.js"
import type { KeysNode } from "./refinements/keys.js"
import type { OptionalNode } from "./refinements/optional.js"
import type { PatternNode } from "./refinements/pattern.js"
import type { PredicateNode } from "./refinements/predicate.js"
import type { RequiredNode } from "./refinements/required.js"
import type { SequenceNode } from "./refinements/sequence.js"
import type { ScopeNode } from "./scope.js"
import type { CompilationContext } from "./shared/compile.js"
import type {
	BaseNodeDeclaration,
	attachmentsOf,
	ownIntersectionAlternateResult,
	ownIntersectionResult
} from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import {
	basisKinds,
	constraintKinds,
	precedenceOfKind,
	propRefinementKinds,
	refinementKinds,
	setKinds,
	typeKinds,
	type BasisKind,
	type ConstraintKind,
	type NodeKind,
	type PropRefinementKind,
	type RefinementKind,
	type SetKind,
	type TypeKind,
	type UnknownNodeImplementation,
	type nodeImplementationInputOf,
	type nodeImplementationOf
} from "./shared/implement.js"
import {
	TraversalContext,
	type TraverseAllows,
	type TraverseApply
} from "./traversal/context.js"
import type { ArkResult } from "./traversal/errors.js"
import type { DomainNode } from "./types/domain.js"
import type { IntersectionNode } from "./types/intersection.js"
import type {
	MorphNode,
	distill,
	extractIn,
	extractOut
} from "./types/morph.js"
import type { ProtoNode } from "./types/proto.js"
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
		new (attachments: never): BaseNode<any, d, any> & BaseAbstracts<d>
		readonly implementation: nodeImplementationOf<d>
	}

export interface BaseAbstracts<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> {
	hasOpenIntersection: d["open"]
	traverseAllows: TraverseAllows<d["prerequisite"]>
	traverseApply: TraverseApply<d["prerequisite"]>
	compileApply(ctx: CompilationContext): string
	compileAllows(ctx: CompilationContext): string
}

export const isNode = (value: unknown): value is Node =>
	value instanceof BaseNode

export type UnknownNode = BaseNode<
	any,
	BaseNodeDeclaration,
	NodeSubclass<BaseNodeDeclaration>
>

type kindOf<self> = self extends Constructor<{
	kind: infer kind extends NodeKind
}>
	? kind
	: never

type declarationOf<self> = Declaration<kindOf<self>>

export abstract class BaseNode<
	t,
	d extends BaseNodeDeclaration,
	// subclass doesn't affect the class's type, but rather is used to validate
	// the correct implementation of the static implementation
	subclass extends NodeSubclass<d>
> extends DynamicBase<attachmentsOf<d>> {
	protected static implement<self>(
		this: self,
		implementation: nodeImplementationInputOf<declarationOf<self>>
	): nodeImplementationOf<declarationOf<self>>
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
			implementation.defaults.message ??= (ctx) =>
				ctx.path.length === 0
					? capitalize(ctx.problem)
					: ctx.path.length === 1 && typeof ctx.path[0] === "number"
					? `Item at index ${ctx.path[0]} ${ctx.problem}`
					: `${ctx.path} ${ctx.problem}`
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
	protected readonly abstracts: BaseAbstracts = this as never
	// use declare here to ensure description from attachments isn't overwritten
	declare readonly description: string

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
	}

	allows = (data: d["prerequisite"]): data is distill<extractIn<t>> => {
		const ctx = new TraversalContext(data, this.$.config)
		return this.abstracts.traverseAllows(data as never, ctx)
	}

	apply(data: d["prerequisite"]): ArkResult<distill<extractOut<t>>> {
		const ctx = new TraversalContext(data, this.$.config)
		this.abstracts.traverseApply(data, ctx)
		if (ctx.currentErrors.length === 0) {
			return { out: data } as any
		}
		return { errors: ctx.currentErrors }
	}

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
		return this.$.parseNode(this.kind, ioInner) as never
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

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isProp(): this is Node<PropRefinementKind> {
		return includes(propRefinementKinds, this.kind)
	}

	isType(): this is TypeNode {
		return includes(typeKinds, this.kind)
	}

	isSet(): this is Node<SetKind> {
		return includes(setKinds, this.kind)
	}

	isConstraint(): this is Node<ConstraintKind> {
		return includes(constraintKinds, this.kind)
	}

	toString() {
		return this.description
	}

	protected abstract intersectOwnInner(
		r: Node<d["kind"]>
	): d["inner"] | ownIntersectionAlternateResult<d>

	intersectOwnKind(r: Node<d["kind"]> | undefined): ownIntersectionResult<d> {
		if (r === undefined) {
			return this as never
		}
		// TODO: check equality
		const innerResult = this.intersectOwnInner(r)
		if (innerResult === null || innerResult instanceof Disjoint) {
			return innerResult
		}
		return this.$.parseNode(this.kind, innerResult as never)
	}

	transform(
		mapper: DeepNodeTransformation,
		shouldTransform: (node: Node) => boolean
	): Node<reducibleKindOf<this["kind"]>> {
		if (!shouldTransform(this as never)) {
			return this as never
		}
		const innerWithTransformedChildren = map(this.inner as Dict, (k, v) => [
			k,
			this.impl.keys[k].child
				? isArray(v)
					? v.map((node) => (node as Node).transform(mapper, shouldTransform))
					: (v as Node).transform(mapper, shouldTransform)
				: v
		])
		return this.$.parseNode(
			this.kind,
			mapper(this.kind, innerWithTransformedChildren as never) as never
		)
	}

	compileApplyInvocation(ctx: CompilationContext) {
		return `this.${this.name}(${ctx.dataArg}, ${ctx.ctxArg})`
	}

	compileAllowsInvocation(ctx: CompilationContext) {
		return `this.${this.name}(${ctx.dataArg})`
	}
}

export type DeepNodeTransformation = <kind extends NodeKind>(
	kind: kind,
	inner: Inner<kind>
) => Inner<kind>

interface NodesByKind<t = any> {
	union: UnionNode<t>
	morph: MorphNode<t>
	intersection: IntersectionNode<t>
	unit: UnitNode<t>
	proto: ProtoNode<t>
	domain: DomainNode<t>
	divisor: DivisorNode
	min: MinNode
	max: MaxNode
	minLength: MinLengthNode
	maxLength: MaxLengthNode
	after: AfterNode
	before: BeforeNode
	pattern: PatternNode
	predicate: PredicateNode
	required: RequiredNode
	optional: OptionalNode
	index: IndexNode
	sequence: SequenceNode
	keys: KeysNode
}

export type Node<
	kind extends NodeKind = NodeKind,
	t = any
> = NodesByKind<t>[kind]

export type TypeNode<t = any, kind extends TypeKind = TypeKind> = Node<kind, t>

export type TypeSchema<kind extends TypeKind = TypeKind> = Schema<kind>
