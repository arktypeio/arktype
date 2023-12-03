import {
	DynamicBase,
	includes,
	isArray,
	type Dict,
	type Entry,
	type Json,
	type JsonData,
	type entriesOf,
	type listable
} from "@arktype/util"
import type { BasisKind } from "./bases/basis.js"
import type { DomainNode } from "./bases/domain.js"
import type { ProtoNode } from "./bases/proto.js"
import type { UnitNode } from "./bases/unit.js"
import type { BaseParser, SchemaParseContext } from "./parse.js"
import type { DivisorNode } from "./refinements/divisor.js"
import type { PatternNode } from "./refinements/pattern.js"
import type { PredicateNode } from "./refinements/predicate.js"
import type { OptionalNode } from "./refinements/props/optional.js"
import type { RequiredNode } from "./refinements/props/required.js"
import type { ScopeNode } from "./scope.js"
import type { IntersectionNode } from "./sets/intersection.js"
import type {
	MorphNode,
	extractIn,
	extractOut,
	ioKindOf
} from "./sets/morph.js"
import type { UnionNode } from "./sets/union.js"
import {
	Problems,
	type CheckResult,
	type CompilationContext,
	type TraverseAllows,
	type TraverseApply
} from "./shared/compilation.js"
import type {
	BaseAttributes,
	BaseNodeDeclaration,
	attachmentsOf
} from "./shared/declare.js"
import {
	basisKinds,
	closedRefinementKinds,
	constraintKinds,
	openRefinementKinds,
	refinementKinds,
	setKinds,
	typeKinds,
	type ClosedRefinementKind,
	type ConstraintKind,
	type NodeKind,
	type NodeParserImplementation,
	type OpenRefinementKind,
	type RefinementKind,
	type SetKind,
	type TypeKind,
	type UnknownNodeImplementation
} from "./shared/define.js"
import type { Disjoint } from "./shared/disjoint.js"
import type { intersectionOf, reifyIntersections } from "./shared/intersect.js"
import { NodeImplementationByKind } from "./shared/nodes.js"
import { arkKind, inferred } from "./shared/symbols.js"

export interface BaseAttachments {
	alias?: string
	readonly id: string
	readonly kind: NodeKind
	readonly inner: Dict
	readonly meta: Dict
	readonly entries: readonly Entry[]
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: JsonData
	readonly children: Node[]
	readonly innerId: string
	readonly typeId: string
	readonly scope: ScopeNode
}

export interface NarrowedAttachments<d extends BaseNodeDeclaration>
	extends BaseAttachments {
	kind: d["kind"]
	inner: d["inner"]
	entries: entriesOf<d["inner"]>
	children: Node<d["childKind"]>[]
}

export type NodeSubclass = {
	readonly declaration: BaseNodeDeclaration
	readonly parser: BaseParser
}

export abstract class BaseNode<
	t = unknown,
	subclass extends NodeSubclass = NodeSubclass
> extends DynamicBase<
	attachmentsOf<subclass["declaration"]> & {
		(data: unknown): CheckResult<extractOut<t>>
	}
> {
	declare infer: extractOut<t>;
	declare [inferred]: t;

	readonly [arkKind] = this.isType() ? "typeNode" : "refinementNode"
	readonly implementation: UnknownNodeImplementation = NodeImplementationByKind[
		this.kind
	] as never
	readonly includesMorph: boolean =
		this.kind === "morph" || this.children.some((child) => child.includesMorph)
	readonly includesContextDependentPredicate: boolean =
		// if a predicate accepts exactly one arg, we can safely skip passing context
		(this.hasKind("predicate") && this.inner.predicate.length !== 1) ||
		this.children.some((child) => child.includesContextDependentPredicate)
	readonly referencesById: Record<string, Node> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesById),
		{}
	)
	readonly references: readonly Node[] = Object.values(this.referencesById)
	readonly contributesReferencesById: Record<string, Node>
	readonly contributesReferences: readonly Node[]

	// we use declare here to avoid it being initialized outside the constructor
	// and detected as an overwritten key
	declare readonly description: string

	constructor(baseAttachments: BaseAttachments) {
		super(baseAttachments as never)
		this.contributesReferencesById =
			this.id in this.referencesById
				? this.referencesById
				: { ...this.referencesById, [this.id]: this }
		this.contributesReferences = Object.values(this.contributesReferencesById)
		this.description ??= this.writeDefaultDescription()
	}

	abstract writeDefaultDescription(): string
	abstract traverseAllows: TraverseAllows<d["checks"]>
	abstract traverseApply: TraverseApply<d["checks"]>

	allows = (data: unknown): data is t => {
		const problems = new Problems()
		return this.traverseAllows(data as never, problems)
	}

	apply(data: unknown): CheckResult<t> {
		const problems = new Problems()
		this.traverseApply(data as never, problems)
		if (problems.length === 0) {
			return { data } as any
		}
		return { problems }
	}

	compileBody(ctx: CompilationContext) {
		return this.implementation.compile(this as never, ctx)
	}

	inCache?: BaseNode;
	get in(): Node<ioKindOf<this["kind"]>, extractIn<t>> {
		if (!this.inCache) {
			this.inCache = this.getIo("in")
		}
		return this.inCache as never
	}

	outCache?: BaseNode
	get out(): Node<ioKindOf<this["kind"]>, extractOut<t>> {
		if (!this.outCache) {
			this.outCache = this.getIo("out")
		}
		return this.outCache as never
	}

	private getIo(kind: "in" | "out"): BaseNode {
		if (!this.includesMorph) {
			return this
		}
		const ioInner: Record<string, unknown> = {}
		for (const [k, v] of this.entries) {
			const keyDefinition = this.implementation.keys[k as keyof BaseAttributes]!
			if (keyDefinition.meta) {
				continue
			}
			if (keyDefinition.child) {
				const childValue = v as listable<BaseNode>
				ioInner[k] = isArray(childValue)
					? childValue.map((child) => child[kind])
					: childValue[kind]
			} else {
				ioInner[k] = v
			}
		}
		return this.scope.parseNode(this.kind, ioInner)
	}

	toJSON() {
		return this.json
	}

	equals(other: BaseNode) {
		return this.typeId === other.typeId
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isClosedRefinement(): this is Node<ClosedRefinementKind> {
		return includes(closedRefinementKinds, this.kind)
	}

	isOpenRefinement(): this is Node<OpenRefinementKind> {
		return includes(openRefinementKinds, this.kind)
	}

	isRefinement(): this is Node<RefinementKind> {
		return includes(refinementKinds, this.kind)
	}

	isType(): this is Node<TypeKind> {
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

	private static intersectionCache: Record<string, BaseNode | Disjoint> = {}
	declare intersect: <other extends BaseNode>(
		other: other
	) => intersectionOf<this["kind"], other["kind"]>
	// intersect(other: Node): BaseNode | Disjoint | null {
	// 	const cacheKey = `${this.typeId}&${other.typeId}`
	// 	if (BaseNode.intersectionCache[cacheKey] !== undefined) {
	// 		return BaseNode.intersectionCache[cacheKey]
	// 	}
	// 	const closedResult = this.intersectClosed(other as never)
	// 	if (closedResult !== null) {
	// 		BaseNode.intersectionCache[cacheKey] = closedResult
	// 		BaseNode.intersectionCache[`${other.typeId}&${this.typeId}`] =
	// 			// also cache the result with other's condition as the key.
	// 			// if it was a Disjoint, it has to be inverted so that l,r
	// 			// still line up correctly
	// 			closedResult instanceof Disjoint ? closedResult.invert() : closedResult
	// 		return closedResult
	// 	}
	// 	if (this.isSet() || other.isSet()) {
	// 		return throwInternalError(
	// 			`Unexpected null intersection between non-constraints ${this.kind} and ${other.kind}`
	// 		)
	// 	}
	// 	// if either constraint is a basis or both don't require a basis (i.e.
	// 	// are predicates), it can form an intersection
	// 	return this.isBasis() ||
	// 		other.isBasis() ||
	// 		(this.kind === "predicate" && other.kind === "predicate")
	// 		? this.scope.parseNode(
	// 				"intersection",
	// 				unflattenConstraints([this as never, other])
	// 		  )
	// 		: null
	// }

	// intersectClosed<other extends BaseNode>(
	// 	other: other
	// ): Node<this["kind"] | other["kind"]> | Disjoint | null {
	// 	if (this.equals(other)) {
	// 		// TODO: meta
	// 		return this as never
	// 	}
	// 	const l = leftOperandOf(this, other)
	// 	const thisIsLeft = l === this
	// 	const r: BaseNode = thisIsLeft ? other : this
	// 	const intersections = l.implementation.intersections
	// 	const intersector = (intersections as any)[r.kind] ?? intersections.default
	// 	const result = intersector?.(l, r)
	// 	if (result) {
	// 		if (result instanceof Disjoint) {
	// 			return thisIsLeft ? result : result.invert()
	// 		}
	// 		// TODO: meta
	// 		return this.scope.parseNode(l.kind, result) as never
	// 	}
	// 	return null
	// }

	declare static declaration: BaseNodeDeclaration

	protected static defineIntersections<self>(
		this: self,
		intersections: reifyIntersections<
			declarationOf<self>["kind"],
			declarationOf<self>["intersections"]
		>
	) {
		return intersections
	}

	protected static composeParser: <
		self,
		d extends BaseNodeDeclaration = declarationOf<self>
	>(
		this: self,
		impl: NodeParserImplementation<d>
	) => (def: d["schema"], ctx: SchemaParseContext) => attachmentsOf<d>

	protected createPrimitiveTraversal(
		this: BaseNode & {
			children: readonly never[]
		}
	): TraverseApply<subclass["declaration"]["checks"]> {
		return (data, problems) => {
			if (!this.traverseAllows(data, problems)) {
				problems.add(this.description)
			}
		}
	}
}

type declarationOf<cls> = cls extends {
	declaration: infer declaration extends BaseNodeDeclaration
}
	? declaration
	: never

export type Node<kind extends NodeKind = NodeKind, t = unknown> = {
	union: UnionNode<t>
	morph: MorphNode<t>
	intersection: IntersectionNode<t>
	unit: UnitNode<t>
	proto: ProtoNode<t>
	domain: DomainNode<t>
	divisor: DivisorNode
	// min: MinNode
	// max: MaxNode
	// minLength: MinLengthNode
	// maxLength: MaxLengthNode
	// after: AfterNode
	// before: BeforeNode
	pattern: PatternNode
	predicate: PredicateNode
	required: RequiredNode
	optional: OptionalNode
}[kind]

export type TypeNode<t = unknown, kind extends TypeKind = TypeKind> = Node<
	kind,
	t
>
