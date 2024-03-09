import { morph, type Domain, type evaluate } from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type ConstraintNode,
	type Node,
	type NodeSubclass,
	type TypeNode
} from "../base.js"
import { throwInvalidOperandError } from "../constraints/constraint.js"
import type { Schema, reducibleKindOf } from "../kinds.js"
import { TraversalContext } from "../shared/context.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkResult } from "../shared/errors.js"
import {
	typeKindsRightOf,
	type ConstraintKind,
	type NodeKind,
	type TypeIntersection,
	type TypeKind,
	type kindRightOf
} from "../shared/implement.js"
import { inferred } from "../shared/inference.js"
import type { inferIntersection } from "../shared/intersections.js"
import type { IntersectionNode } from "./intersection.js"
import type { distill, extractIn, extractOut } from "./morph.js"
import type { UnionChildKind, UnionNode } from "./union.js"

export type BaseTypeDeclaration = evaluate<
	BaseNodeDeclaration & { kind: TypeKind }
>

export const defineRightwardIntersections = <kind extends TypeKind>(
	kind: kind,
	implementation: TypeIntersection<kind, typeKindRightOf<kind>>
) => morph(typeKindsRightOf(kind), (i, kind) => [kind, implementation])

export abstract class BaseType<
	t,
	d extends BaseTypeDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<t, d, subclass> {
	declare infer: extractOut<t>;
	declare [inferred]: t

	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<UnionChildKind>[]

	constructor(attachments: BaseAttachments) {
		super(attachments)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
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

	constrain<kind extends ConstraintKind>(
		kind: kind,
		input: Schema<kind>
	): TypeNode<this["infer"]> {
		const constraint = this.$.parse(kind, input)
		if (constraint.impliedBasis && !this.extends(constraint.impliedBasis)) {
			return throwInvalidOperandError(
				kind,
				constraint.impliedBasis,
				this as never
			)
		}
		// TODO: not an intersection
		return this.$.parse("intersection", {
			[kind]: constraint
		})
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	intersect<r extends Node>(
		r: r
	): TypeNode<inferIntersection<this["infer"], r["infer"]>> | Disjoint {
		return this.intersectInternal(r) as never
	}

	and<r extends TypeNode>(
		r: r
	): TypeNode<inferIntersection<this["infer"], r["infer"]>> {
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
}

export type intersectType<l extends TypeKind, r extends NodeKind> = [
	l,
	r
] extends [r, l]
	? l
	: asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<
	l extends NodeKind,
	r extends NodeKind
> = l extends unknown
	? r extends kindRightOf<l>
		? l | reducibleKindOf<l>
		: never
	: never

export interface BaseBasis {
	basisName: string
	domain: Domain
}

export type typeKindRightOf<kind extends TypeKind> = Extract<
	kindRightOf<kind>,
	TypeKind
>

export type typeKindOrRightOf<kind extends TypeKind> =
	| kind
	| typeKindRightOf<kind>
