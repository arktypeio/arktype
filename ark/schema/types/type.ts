import {
	flatMorph,
	throwParseError,
	type Domain,
	type conform
} from "@arktype/util"
import { BaseNode, type Node, type TypeNode } from "../base.js"
import type { constrain } from "../constraints/ast.js"
import {
	throwInvalidOperandError,
	type PrimitiveConstraintKind
} from "../constraints/constraint.js"
import type { Schema, reducibleKindOf } from "../kinds.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	typeKindsRightOf,
	type ConstraintKind,
	type NodeKind,
	type TypeIntersection,
	type TypeKind,
	type kindRightOf
} from "../shared/implement.js"
import type { inferred } from "../shared/inference.js"
import type { inferIntersection } from "../shared/intersections.js"
import type { IntersectionNode, constraintKindOf } from "./intersection.js"
import type { Morph } from "./morph.js"
import type { UnionChildKind, UnionNode } from "./union.js"

export const defineRightwardIntersections = <kind extends TypeKind>(
	kind: kind,
	implementation: TypeIntersection<kind, typeKindRightOf<kind>>
): { [k in typeKindRightOf<kind>]: TypeIntersection<kind, k> } =>
	flatMorph(typeKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never

export interface BaseTypeDeclaration extends BaseNodeDeclaration {
	kind: TypeKind
}

export abstract class BaseType<
	t,
	d extends BaseTypeDeclaration
> extends BaseNode<t, d> {
	readonly branches: readonly Node<UnionChildKind>[] = this.hasKind("union")
		? this.inner.branches
		: [this as never]

	private keyofCache: TypeNode | undefined
	keyof(): TypeNode<keyof this["in"]["infer"]> {
		if (!this.keyofCache) {
			this.keyofCache = this.rawKeyOf()
			if (this.keyofCache.isNever())
				throwParseError(
					`keyof ${this.expression} results in an unsatisfiable type`
				)
		}
		return this.keyofCache as never
	}

	abstract rawKeyOf(): TypeNode

	intersect<r extends TypeNode>(
		r: r
	): TypeNode<inferIntersection<this["infer"], r["infer"]>> | Disjoint {
		return this.intersectInternal(r) as never
	}

	and<r extends TypeNode>(
		r: r
	): TypeNode<inferIntersection<this["infer"], r["infer"]>> {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<r extends TypeNode>(r: r): TypeNode<t | r["infer"]> {
		const branches = [...this.branches, ...(r.branches as any)]
		return this.$.node(branches) as never
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	get<key extends PropertyKey>(
		...path: readonly (key | TypeNode<key>)[]
	): this {
		return this
	}

	extract(other: TypeNode): TypeNode {
		return this.$.node(
			this.branches.filter((branch) => branch.extends(other)),
			{ root: true }
		)
	}

	exclude(other: TypeNode): TypeNode {
		return this.$.node(
			this.branches.filter((branch) => !branch.extends(other)),
			{ root: true }
		) as never
	}

	array(): IntersectionNode<t[]> {
		return this.$.node(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true, root: true }
		) as never
	}

	// add the extra inferred intersection so that a variable of Type
	// can be narrowed without other branches becoming never
	extends<r>(other: TypeNode<r>): this is TypeNode<r> & { [inferred]?: r } {
		const intersection = this.intersect(other as never)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	configure(configOrDescription: BaseMeta | string): this {
		return this.configureShallowDescendants(configOrDescription)
	}

	describe(description: string): this {
		return this.configure(description)
	}

	// TODO: should return out
	from(literal: this["in"]["infer"]): this["out"]["infer"] {
		return literal as never
	}

	morph(morph: Morph, outValidator?: unknown): unknown {
		if (this.hasKind("union")) {
			const branches = this.branches.map((node) =>
				node.morph(morph, outValidator as never)
			)
			return this.$.node("union", { ...this.inner, branches })
		}
		if (this.hasKind("morph")) {
			return this.$.node("morph", {
				...this.inner,
				morphs: [...this.morphs, morph]
			})
		}
		return this.$.node("morph", {
			in: this,
			morphs: [morph]
		})
	}

	assert(data: unknown): this["infer"] {
		const result = this.apply(data)
		return result.errors ? result.errors.throw() : result.out
	}

	constrain<
		kind extends PrimitiveConstraintKind,
		const schema extends Schema<kind>
	>(
		kind: conform<kind, constraintKindOf<this["in"]["infer"]>>,
		schema: schema
	): TypeNode<constrain<t, kind, schema>> {
		return this.rawConstrain(kind, schema) as never
	}

	protected rawConstrain(kind: ConstraintKind, schema: unknown): TypeNode {
		const constraint = this.$.node(kind, schema as never)
		if (
			constraint.impliedBasis &&
			!this.extends(constraint.impliedBasis as never)
		) {
			return throwInvalidOperandError(
				kind,
				constraint.impliedBasis,
				this as never
			)
		}

		return this.and(
			// TODO: not an intersection
			this.$.node("intersection", {
				[kind]: constraint
			})
		) as never
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
