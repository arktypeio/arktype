import type { Domain, and } from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type NodeSubclass,
	type TypeNode
} from "../base.js"
import type { Inner, Schema, reducibleKindOf } from "../kinds.js"
import type { CompilationContext } from "../shared/compile.js"
import type {
	BaseNodeDeclaration,
	ownIntersectionAlternateResult
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { NodeKind, TypeKind, kindRightOf } from "../shared/implement.js"
import { inferred } from "../shared/utils.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import type { IntersectionNode } from "./intersection.js"
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

	abstract traverseAllows: TraverseAllows<d["prerequisite"]>
	abstract traverseApply: TraverseApply<d["prerequisite"]>
	abstract compileApply(ctx: CompilationContext): string
	abstract compileAllows(ctx: CompilationContext): string

	constructor(attachments: BaseAttachments) {
		super(attachments)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
	}

	abstract intersectRightwardInner(
		r: Node<typeKindRightOf<d["kind"]>>
	): d["inner"] | Disjoint

	protected abstract intersectOwnInner(
		r: Node<d["kind"]>
	): d["inner"] | Exclude<ownIntersectionAlternateResult<d>, null>

	private static intersectionCache: Record<string, TypeNode | Disjoint> = {}
	intersect<other extends TypeNode>(
		other: other // TODO: fix
	): Node<this["kind"] | other["kind"]> | Disjoint
	intersect(other: Node): Node | Disjoint {
		const cacheKey = `${this.typeId}&${other.typeId}`
		if (BaseType.intersectionCache[cacheKey] !== undefined) {
			return BaseType.intersectionCache[cacheKey]
		}

		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}

		const l: TypeNode =
			this.precedence <= other.precedence ? this : (other as any)
		const thisIsLeft = l === (this as never)
		const r: TypeNode = thisIsLeft ? other : (this as any)
		const innerResult: Inner<TypeKind> | Disjoint =
			l.kind === r.kind
				? l.intersectOwnKind(r as never)
				: l.intersectRightwardInner(r as never)

		const nodeResult: TypeNode | Disjoint =
			innerResult instanceof Disjoint
				? innerResult
				: this.$.parseNode(l.kind, innerResult)

		BaseType.intersectionCache[cacheKey] = nodeResult
		BaseType.intersectionCache[`${other.typeId}&${this.typeId}`] =
			// also cache the result with other's condition as the key.
			// if it was a Disjoint, it has to be inverted so that l,r
			// still line up correctly
			nodeResult instanceof Disjoint ? nodeResult.invert() : nodeResult
		return nodeResult
	}

	constrain<refinementKind extends NodeKind>(
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
		return this.hasKind("intersection") && this.children.length === 0
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
