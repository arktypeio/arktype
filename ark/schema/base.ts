import {
	DynamicBase,
	includes,
	isArray,
	throwInternalError,
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
import type {
	AfterNode,
	BeforeNode,
	MaxLengthNode,
	MaxNode,
	MinLengthNode,
	MinNode
} from "./refinements/bounds.js"
import type { DivisorNode } from "./refinements/divisor.js"
import type { PatternNode } from "./refinements/pattern.js"
import type { PredicateNode } from "./refinements/predicate.js"
import type { OptionalNode } from "./refinements/props/optional.js"
import type { RequiredNode } from "./refinements/props/required.js"
import type { ScopeNode } from "./scope.js"
import {
	unflattenConstraints,
	type IntersectionNode
} from "./sets/intersection.js"
import type { MorphNode } from "./sets/morph.js"
import type { UnionNode } from "./sets/union.js"
import {
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
	type TypeKind
} from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import {
	leftOperandOf,
	type NodeIntersections,
	type intersectionOf
} from "./shared/intersect.js"
import type { ioKindOf } from "./shared/nodes.js"
import { arkKind, type ArkKind } from "./shared/symbols.js"

export interface BaseAttachments {
	alias?: string
	readonly id: string
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
	inner: d["inner"]
	entries: entriesOf<d["inner"]>
	children: Node<d["childKind"]>[]
}

export interface NodeSubclass<d extends BaseNodeDeclaration> {
	readonly kind: d["kind"]
	// allow subclasses to accept narrowed check input
	readonly declaration: BaseNodeDeclaration
	readonly parser: NodeParserImplementation<d>
	readonly intersections: NodeIntersections<d>
}

export interface UnknownNodeSubclass {
	readonly kind: NodeKind
	// allow subclasses to accept narrowed check input
	readonly declaration: BaseNodeDeclaration
	readonly parser: NodeParserImplementation<BaseNodeDeclaration>
	readonly intersections: Record<
		string,
		(l: any, r: any) => {} | Disjoint | null
	>
}

export abstract class BaseNode<
	subclass extends NodeSubclass<subclass["declaration"]> = UnknownNodeSubclass
> extends DynamicBase<attachmentsOf<subclass["declaration"]>> {
	protected readonly cls: subclass = this.constructor as never
	readonly kind: subclass["kind"] = this.cls.kind;
	abstract readonly [arkKind]: ArkKind
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
				: { ...this.referencesById, [this.id]: this as never }
		this.contributesReferences = Object.values(this.contributesReferencesById)
		this.description ??= this.writeDefaultDescription()
	}

	abstract writeDefaultDescription(): string
	abstract traverseAllows: TraverseAllows<subclass["declaration"]["checks"]>
	abstract traverseApply: TraverseApply<subclass["declaration"]["checks"]>
	abstract compileBody(ctx: CompilationContext): string

	inCache?: BaseNode;
	get in(): Node<ioKindOf<subclass["kind"]>> {
		this.inCache ??= this.getIo("in")
		return this.inCache as never
	}

	outCache?: BaseNode
	get out(): Node<ioKindOf<subclass["kind"]>> {
		this.outCache ??= this.getIo("out")
		return this.outCache as never
	}

	private getIo(kind: "in" | "out"): BaseNode {
		if (!this.includesMorph) {
			return this as never
		}
		const ioInner: Record<any, unknown> = {}
		for (const [k, v] of this.entries) {
			const keyDefinition = this.cls.parser.keys[k as keyof BaseAttributes]!
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
		return this.scope.parseNode(this.kind, ioInner) as never
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

	private static intersectionCache: Record<string, Node | Disjoint> = {}
	intersect<other extends Node>(
		other: other
	): intersectionOf<this["kind"], other["kind"]>
	intersect(other: Node): Node | Disjoint | null {
		const cacheKey = `${this.typeId}&${other.typeId}`
		if (BaseNode.intersectionCache[cacheKey] !== undefined) {
			return BaseNode.intersectionCache[cacheKey]
		}
		const closedResult = this.intersectClosed(other as never)
		if (closedResult !== null) {
			BaseNode.intersectionCache[cacheKey] = closedResult
			BaseNode.intersectionCache[`${other.typeId}&${this.typeId}`] =
				// also cache the result with other's condition as the key.
				// if it was a Disjoint, it has to be inverted so that l,r
				// still line up correctly
				closedResult instanceof Disjoint ? closedResult.invert() : closedResult
			return closedResult
		}
		if (this.isSet() || other.isSet()) {
			return throwInternalError(
				`Unexpected null intersection between non-constraints ${this.kind} and ${other.kind}`
			)
		}
		// if either constraint is a basis or both don't require a basis (i.e.
		// are predicates), it can form an intersection
		return this.isBasis() ||
			other.isBasis() ||
			(this.kind === "predicate" && other.kind === "predicate")
			? this.scope.parseNode(
					"intersection",
					unflattenConstraints([this as never, other])
			  )
			: null
	}

	intersectClosed<other extends Node>(
		other: other
	): Node<this["kind"] | other["kind"]> | Disjoint | null {
		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}
		const l = leftOperandOf(this as never, other)
		const thisIsLeft = l === (this as never)
		const r: Node = thisIsLeft ? other : (this as never)
		const intersections = l.cls
			.intersections as NodeIntersections<BaseNodeDeclaration>
		const intersector = intersections[r.kind] ?? intersections.default
		const result = intersector?.(l, r as never)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: meta
			return this.scope.parseNode(l.kind, result) as never
		}
		return null
	}

	protected createPrimitiveTraversal(
		this: BaseNode<any> & {
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

export type Node<kind extends NodeKind = NodeKind, t = any> = {
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
}[kind]

// TODO: possible to default these to unknown?
export type TypeNode<t = any, kind extends TypeKind = TypeKind> = Node<kind, t>
