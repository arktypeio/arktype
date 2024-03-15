import { morph, type Domain } from "@arktype/util"
import { BaseNode, type Node } from "../base.js"
import type { applySchema, validateConstraintArg } from "../constraints/ast.js"
import { throwInvalidOperandError } from "../constraints/constraint.js"
import type { Predicate, inferNarrow } from "../constraints/predicate.js"
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
import type { inferTypeRoot, validateTypeRoot } from "../type.js"
import type { IntersectionNode, constraintKindOf } from "./intersection.js"
import type {
	Morph,
	Out,
	extractOut,
	includesMorphs,
	inferMorphOut
} from "./morph.js"
import type { UnionChildKind, UnionNode } from "./union.js"

export const defineRightwardIntersections = <kind extends TypeKind>(
	kind: kind,
	implementation: TypeIntersection<kind, typeKindRightOf<kind>>
): { [k in typeKindRightOf<kind>]: TypeIntersection<kind, k> } =>
	morph(typeKindsRightOf(kind), (i, kind) => [kind, implementation]) as never

export type Type<t = any, $ = any> = Node<TypeKind, t, $>

export abstract class BaseType<
	t,
	d extends BaseNodeDeclaration,
	$ = any
> extends BaseNode<t, d> {
	readonly branches: readonly Node<UnionChildKind>[] = this.hasKind("union")
		? this.inner.branches
		: [this as never]

	keyof(): Type<keyof this["in"]["infer"], $> {
		return this as never
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	intersect<r extends Type>(
		r: r
	): Type<inferIntersection<this["infer"], r["infer"]>, t> | Disjoint {
		return this.intersectInternal(r) as never
	}

	and<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>>, $> {
		const result = this.intersect(this.$.parseTypeRoot(def))
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<def>(def: validateTypeRoot<def, $>): Type<t | inferTypeRoot<def, $>, $> {
		const branches = [
			...this.branches,
			...(this.$.parseTypeRoot(def).branches as any)
		]
		return this.$.node(branches)
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	get<key extends PropertyKey>(...path: readonly (key | Type<key>)[]): this {
		return this
	}

	extract(other: Type): Type {
		return this.$.node(
			this.branches.filter((branch) => branch.extends(other)),
			{ root: true }
		)
	}

	exclude(other: Type): Type {
		return this.$.node(
			this.branches.filter((branch) => !branch.extends(other)),
			{ root: true }
		)
	}

	array(): Type<t[], $> {
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
	extends<r>(other: Type<r>): this is Type<r, $> & { [inferred]?: r } {
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

	// TODO: standardize these
	morph<morph extends Morph<this["infer"]>>(
		morph: morph
	): Type<(In: this["in"]["infer"]) => Out<inferMorphOut<ReturnType<morph>>>, $>
	morph<morph extends Morph<this["infer"]>, def>(
		morph: morph,
		outValidator: validateTypeRoot<def, $>
	): Type<
		(In: this["in"]["infer"]) => Out<
			// TODO: validate overlapping
			// inferMorphOut<ReturnType<morph>> &
			extractOut<inferTypeRoot<def, $>>
		>,
		$
	>
	morph(morph: Morph, outValidator?: unknown): unknown {
		// TODO: tuple expression for out validator
		outValidator
		return this as never
	}

	// TODO: based on below, should maybe narrow morph output if used after
	narrow<def extends Predicate<extractOut<t>>>(
		def: def
	): Type<
		includesMorphs<t> extends true
			? (In: this["in"]["infer"]) => Out<inferNarrow<this["infer"], def>>
			: inferNarrow<this["infer"], def>,
		$
	> {
		return this.constrain("predicate", def) as never
	}

	assert(data: unknown): this["infer"] {
		const result = this(data)
		return result.errors ? result.errors.throw() : result.out
	}

	constrain<kind extends constraintKindOf<this["in"]["infer"]>>(
		kind: kind,
		schema: Schema<kind>
	): Type<t, $> {
		return this.rawConstrain(kind, schema) as never
	}

	protected rawConstrain(kind: ConstraintKind, schema: unknown): Type {
		const constraint = this.$.node(kind, schema as never)
		if (constraint.impliedBasis && !this.extends(constraint.impliedBasis)) {
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

	divisibleBy<
		const schema extends validateConstraintArg<"divisor", this["infer"]>
	>(schema: schema): Type<applySchema<t, "divisor", schema>, $> {
		return this.rawConstrain("divisor", schema as never) as never
	}

	atLeast<const schema extends validateConstraintArg<"min", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "min", schema>, $> {
		return this.rawConstrain("min", schema as never) as never
	}

	atMost<const schema extends validateConstraintArg<"max", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "max", schema>, $> {
		return this.rawConstrain("max", schema as never) as never
	}

	moreThan<const schema extends validateConstraintArg<"min", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "min", schema>, $> {
		return this.rawConstrain("min", schema as never) as never
	}

	lessThan<const schema extends validateConstraintArg<"max", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "max", schema>, $> {
		return this.rawConstrain("max", schema as never) as never
	}

	atLeastLength<
		const schema extends validateConstraintArg<"minLength", this["infer"]>
	>(schema: schema): Type<applySchema<t, "minLength", schema>, $> {
		return this.rawConstrain("minLength", schema as never) as never
	}

	atMostLength<
		const schema extends validateConstraintArg<"maxLength", this["infer"]>
	>(schema: schema): Type<applySchema<t, "maxLength", schema>, $> {
		return this.rawConstrain("maxLength", schema as never) as never
	}

	earlierThan<
		const schema extends validateConstraintArg<"before", this["infer"]>
	>(schema: schema): Type<applySchema<t, "before", schema>, $> {
		return this.rawConstrain("before", schema as never) as never
	}

	laterThan<const schema extends validateConstraintArg<"after", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "after", schema>, $> {
		return this.rawConstrain("after", schema as never) as never
	}
}

export const isType = (value: unknown): value is Type =>
	value instanceof BaseType

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
