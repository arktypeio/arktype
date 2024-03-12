import { morph, type Domain, type evaluate } from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type NodeSubclass,
	type TypeNode
} from "../base.js"
import type { applySchema, validateConstraintArg } from "../constraints/ast.js"
import { throwInvalidOperandError } from "../constraints/constraint.js"
import type { Predicate, inferNarrow } from "../constraints/predicate.js"
import type { Schema, reducibleKindOf } from "../kinds.js"
import { TraversalContext } from "../shared/context.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
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
import { Type, type inferTypeRoot, type validateTypeRoot } from "../type.js"
import type { IntersectionNode } from "./intersection.js"
import type {
	Morph,
	Out,
	distill,
	extractIn,
	extractOut,
	includesMorphs,
	inferMorphOut
} from "./morph.js"
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
	subclass extends NodeSubclass<d>,
	$ = any
> extends BaseNode<t, d, subclass> {
	declare infer: distill<extractOut<t>>;
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
		const constraint = this.$.parseSchema(kind, input)
		if (constraint.impliedBasis && !this.extends(constraint.impliedBasis)) {
			return throwInvalidOperandError(
				kind,
				constraint.impliedBasis,
				this as never
			)
		}

		return this.and(
			// TODO: not an intersection
			this.$.parseSchema("intersection", {
				[kind]: constraint
			})
		) as never
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

	or<r extends TypeNode>(r: r): TypeNode<t | r["infer"]> {
		const branches = [...this.branches, ...(r.branches as any)]
		return branches.length === 1
			? branches[0]
			: (this.$.parseSchema("union", { branches }) as never)
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
		return this.$.parseRootSchema(
			"union",
			this.branches.filter((branch) => branch.extends(other))
		)
	}

	exclude(other: TypeNode) {
		return this.$.parseRootSchema(
			"union",
			this.branches.filter((branch) => !branch.extends(other))
		)
	}

	array(): IntersectionNode<t[]> {
		return this.$.parseRootSchema(
			"intersection",
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	extends<other extends TypeNode>(
		other: other
	): this is TypeNode<other["infer"]> {
		const intersection = this.intersect(other)
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
		// return new Type(
		//     this.constrain("morph", morph),
		//     this.scope
		// ) as never
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
		return new Type(this.constrain("predicate", def), this.$) as never
	}

	assert(data: unknown): this["infer"] {
		const result = this(data)
		return result.errors ? result.errors.throw() : result.out
	}

	divisor<const schema extends validateConstraintArg<"divisor", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "divisor", schema>, $> {
		return new Type(this.constrain("divisor", schema as never), this.$) as never
	}

	min<const schema extends validateConstraintArg<"min", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "min", schema>, $> {
		return new Type(this.constrain("min", schema as never), this.$) as never
	}

	max<const schema extends validateConstraintArg<"max", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "max", schema>, $> {
		return new Type(this.constrain("max", schema as never), this.$) as never
	}

	minLength<
		const schema extends validateConstraintArg<"minLength", this["infer"]>
	>(schema: schema): Type<applySchema<t, "minLength", schema>, $> {
		return new Type(
			this.constrain("minLength", schema as never),
			this.$
		) as never
	}

	maxLength<
		const schema extends validateConstraintArg<"maxLength", this["infer"]>
	>(schema: schema): Type<applySchema<t, "maxLength", schema>, $> {
		return new Type(
			this.constrain("maxLength", schema as never),
			this.$
		) as never
	}

	before<const schema extends validateConstraintArg<"before", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "before", schema>, $> {
		return new Type(this.constrain("before", schema as never), this.$) as never
	}

	after<const schema extends validateConstraintArg<"after", this["infer"]>>(
		schema: schema
	): Type<applySchema<t, "after", schema>, $> {
		return new Type(this.constrain("after", schema as never), this.$) as never
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
