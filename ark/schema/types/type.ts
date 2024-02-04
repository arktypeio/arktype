import { throwInternalError, type Domain, type and } from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type NodeSubclass,
	type TypeNode,
	type UnknownNode
} from "../base.js"
import type { Schema, reducibleKindOf } from "../kinds.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	leftOperandOf,
	type RefinementKind,
	type TypeKind,
	type kindRightOf
} from "../shared/implement.js"
import { inferred } from "../shared/utils.js"
import type { IntersectionInner, IntersectionNode } from "./intersection.js"
import type { extractOut } from "./morph.js"
import type { UnionChildKind, UnionNode } from "./union.js"

export type BaseTypeDeclaration = and<BaseNodeDeclaration, { kind: TypeKind }>

export abstract class BaseType<
	t,
	d extends BaseTypeDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<t, d, subclass> {
	declare infer: extractOut<t>;
	declare [inferred]: t

	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<UnionChildKind>[]

	hasOpenIntersection = false as d["open"]

	constructor(attachments: BaseAttachments) {
		super(attachments)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
	}

	protected abstract intersectRightwardInner(
		r: Node<typeKindRightOf<d["kind"]>>
	): d["inner"] | Disjoint

	private static intersectionCache: Record<string, Node | Disjoint> = {}
	intersect<other extends TypeNode>(
		other: other
	): Node<this["kind"] | other["kind"]> | Disjoint
	intersect(other: Node): Node | Disjoint | null {
		const cacheKey = `${this.typeId}&${other.typeId}`
		if (BaseType.intersectionCache[cacheKey] !== undefined) {
			return BaseType.intersectionCache[cacheKey]
		}
		const closedResult = this.intersectClosed(other as never)
		if (closedResult !== null) {
			BaseType.intersectionCache[cacheKey] = closedResult
			BaseType.intersectionCache[`${other.typeId}&${this.typeId}`] =
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
		const intersectionInner: IntersectionInner | null = this.isBasis()
			? {
					basis: this,
					[other.kind]: other.hasOpenIntersection ? [other] : other
			  }
			: other.isBasis()
			? {
					basis: other,
					[this.kind]: this.abstracts.hasOpenIntersection ? [this] : this
			  }
			: this.hasKind("predicate") && other.hasKind("predicate")
			? { predicate: [this, other] }
			: null
		return (
			intersectionInner && this.$.parseNode("intersection", intersectionInner)
		)
	}

	intersectClosed<other extends Node>(
		other: other
	): Node<d["kind"] | other["kind"]> | Disjoint | null {
		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}
		const l: UnknownNode = leftOperandOf(this as never, other) as any
		const thisIsLeft = l === (this as never)
		const r: UnknownNode = thisIsLeft ? other : (this as any)
		// TODO: l.impl
		const intersections = {} as any
		const intersector = intersections[r.kind] ?? intersections.default
		const result = intersector?.(l, r as never)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: meta
			return this.$.parseNode(l.kind, result) as never
		}
		return null
	}

	constrain<refinementKind extends RefinementKind>(
		kind: refinementKind,
		input: Schema<refinementKind>
	): Node<reducibleKindOf<this["kind"]>> {
		return this as never
		// const refinement = this.$.parseNode(kind, input)
		// return this.and(refinement) as never
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	// TODO: inferIntersection
	and<other extends TypeNode>(
		other: other
		// TODO: FIX
	): TypeNode<d["kind"] | other["kind"]> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	// TODO: limit input types
	or<other extends TypeNode>(
		other: other
	): TypeNode<t | other["infer"], "union" | d["kind"] | other["kind"]> {
		return this.$.parseBranches(
			...this.branches,
			...(other.branches as any)
		) as never
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") && this.constraints.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	getPath() {
		return this
	}

	array(): IntersectionNode<t[]> {
		return this.$.parsePrereduced("intersection", {
			basis: Array,
			sequence: this
		})
	}

	extends<other extends TypeNode>(other: other) {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export interface BaseBasis {
	basisName: string
	domain: Domain
}

export type typeKindRightOf<kind extends TypeKind> = Extract<
	kindRightOf<kind>,
	TypeKind
>
