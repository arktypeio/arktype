import {
	DynamicBase,
	includes,
	isArray,
	throwInternalError,
	type Dict,
	type Entry,
	type Json,
	type entriesOf,
	type listable
} from "@arktype/util"
import type { BasisKind } from "./bases/basis.js"
import type {
	AfterNode,
	BeforeNode,
	DivisorNode,
	MaxLengthNode,
	MaxNode,
	MinLengthNode,
	MinNode,
	OptionalNode,
	PatternNode,
	PredicateNode,
	RequiredNode
} from "./refinements/refinement.js"
import type { ScopeNode } from "./scope.js"
import { unflattenConstraints } from "./sets/intersection.js"
import type {
	extractIn,
	extractOut,
	inKindOf,
	outKindOf
} from "./sets/morph.js"
import {
	Problems,
	type CheckResult,
	type CompilationContext
} from "./shared/compilation.js"
import type { BaseAttributes } from "./shared/declare.js"
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
	type OpenRefinementKind,
	type RefinementKind,
	type SetKind,
	type TypeKind,
	type UnknownNodeImplementation
} from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import { leftOperandOf, type intersectionOf } from "./shared/intersect.js"
import { NodeImplementationByKind } from "./shared/nodes.js"
import { arkKind, inferred } from "./shared/symbols.js"
import type {
	DomainNode,
	IntersectionNode,
	MorphNode,
	ProtoNode,
	UnionNode,
	UnitNode
} from "./type.js"

export interface BaseAttachments {
	alias?: string
	readonly id: string
	readonly kind: NodeKind
	readonly inner: Dict
	readonly entries: readonly Entry[]
	readonly json: Json
	readonly typeJson: Json
	readonly collapsibleJson: Json
	readonly children: Node[]
	readonly innerId: string
	readonly typeId: string
	readonly scope: ScopeNode
}

export class BaseNode<t = unknown> extends DynamicBase<
	BaseAttachments & { (data: unknown): CheckResult<extractOut<t>> }
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
	readonly referencesById: Record<string, BaseNode> = this.children.reduce(
		(result, child) => Object.assign(result, child.contributesReferencesById),
		{}
	)
	readonly references: readonly BaseNode[] = Object.values(this.referencesById)
	readonly contributesReferencesById: Record<string, BaseNode>
	readonly contributesReferences: readonly BaseNode[]

<<<<<<< HEAD
=======
	declare allows: (data: unknown) => data is t
	declare traverse: (data: unknown, problems: Problems) => void
>>>>>>> beta
	// we use declare here to avoid it being initialized outside the constructor
	// and detected as an overwritten key
	declare readonly description: string

	constructor(baseAttachments: BaseAttachments) {
		super(baseAttachments as never)
		for (const k in baseAttachments.inner) {
			if (k in this) {
				// if we attempt to overwrite an existing node key, throw unless
				// it is expected and can be safely ignored.
				// in and out cannot overwrite their respective getters, so instead
				// morph assigns them to `inCache` and `outCache`
				if (k !== "in" && k !== "out") {
					throwInternalError(
						`Unexpected attempt to overwrite existing node key ${k} from ${this.kind} inner`
					)
				}
			} else {
				this[k] = this.inner[k] as never
			}
		}
		const attachments = this.implementation.attach(this as never)
		Object.assign(this, attachments)
		this.contributesReferencesById =
			this.id in this.referencesById
				? this.referencesById
				: { ...this.referencesById, [this.id]: this }
		this.contributesReferences = Object.values(this.contributesReferencesById)
<<<<<<< HEAD
=======
		this.allows = compileAnonymous(this as never, "allows")
		this.traverse = compileAnonymous(this as never, "traverse")
>>>>>>> beta
		// important this is last as writeDefaultDescription could rely on attached
		this.description ??= this.implementation.writeDefaultDescription(
			this as never
		)
	}

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
	get in(): Node<inKindOf<this["kind"]>, extractIn<t>> {
		if (!this.inCache) {
			this.inCache = this.getIo("in")
		}
		return this.inCache as never
	}

	outCache?: BaseNode
	get out(): Node<outKindOf<this["kind"]>, extractOut<t>> {
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
	intersect<other extends BaseNode>(
		other: other
	): intersectionOf<this["kind"], other["kind"]>
	intersect(other: BaseNode): BaseNode | Disjoint | null {
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

	intersectClosed<other extends BaseNode>(
		other: other
	): Node<this["kind"] | other["kind"]> | Disjoint | null {
		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}
		const l = leftOperandOf(this, other)
		const thisIsLeft = l === this
		const r: BaseNode = thisIsLeft ? other : this
		const intersections = l.implementation.intersections
		const intersector = (intersections as any)[r.kind] ?? intersections.default
		const result = intersector?.(l, r)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: meta
			return this.scope.parseNode(l.kind, result) as never
		}
		return null
	}
}

export type Node<kind extends NodeKind = NodeKind, t = unknown> = {
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
