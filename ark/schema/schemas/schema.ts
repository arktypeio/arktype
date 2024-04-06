import { type conform, flatMorph, throwParseError } from "@arktype/util"
import {
	type BaseAttachments,
	BaseNode,
	type Node,
	type Schema
} from "../base.js"
import type { constrain } from "../constraints/ast.js"
import {
	type PrimitiveConstraintKind,
	throwInvalidOperandError
} from "../constraints/constraint.js"
import type { NodeDef, reducibleKindOf } from "../kinds.js"
import type { SchemaScope } from "../scope.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	type ConstraintKind,
	type NodeKind,
	type SchemaKind,
	type TypeIntersection,
	type kindRightOf,
	schemaKindsRightOf
} from "../shared/implement.js"
import type { inferIntersection } from "../shared/intersections.js"
import { arkKind, type inferred } from "../shared/utils.js"
import type { IntersectionNode, constraintKindOf } from "./intersection.js"
import type { UnionChildKind, UnionNode } from "./union.js"

export const defineRightwardIntersections = <kind extends SchemaKind>(
	kind: kind,
	implementation: TypeIntersection<kind, schemaKindRightOf<kind>>
): { [k in schemaKindRightOf<kind>]: TypeIntersection<kind, k> } =>
	flatMorph(schemaKindsRightOf(kind), (i, kind) => [
		kind,
		implementation
	]) as never

export interface BaseSchemaDeclaration extends BaseNodeDeclaration {
	kind: SchemaKind
	attachments: BaseSchemaAttachments<this>
}

export interface BaseSchemaAttachments<d extends BaseNodeDeclaration>
	extends BaseAttachments<d> {
	rawKeyOf(): Schema
}

export class BaseSchema<
	t = any,
	$ = any,
	d extends BaseSchemaDeclaration = BaseSchemaDeclaration
> extends BaseNode<t, d> {
	declare $: SchemaScope<$>

	readonly branches: readonly Node<UnionChildKind>[] = this.hasKind("union")
		? this.inner.branches
		: [this as never]

	readonly [arkKind] = "schema"

	#keyofCache: Schema | undefined
	keyof(): BaseSchema<keyof this["in"]["infer"], $> {
		if (!this.#keyofCache) {
			this.#keyofCache = this.rawKeyOf()
			if (this.#keyofCache.isNever())
				throwParseError(
					`keyof ${this.expression} results in an unsatisfiable type`
				)
		}
		return this.#keyofCache as never
	}

	intersect<r extends Schema>(
		r: r
	): Schema<inferIntersection<this["infer"], r["infer"]>> | Disjoint {
		return this.intersectInternal(r) as never
	}

	intersectSatisfiable<r extends Schema>(
		r: r
	): Schema<inferIntersection<this["infer"], r["infer"]>> {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	union<r extends Schema>(r: r): Schema<t | r["infer"]> {
		const branches = [...this.branches, ...(r.branches as any)]
		return this.$.schema(branches) as never
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	get<key extends PropertyKey>(
		...path: readonly (key | Schema<key>)[]
	): this {
		return this
	}

	extract(other: Schema): Schema {
		return this.$.schema(
			this.branches.filter((branch) => branch.extends(other))
		)
	}

	exclude(other: Schema): Schema {
		return this.$.schema(
			this.branches.filter((branch) => !branch.extends(other))
		) as never
	}

	array(): BaseSchema<t[], $> {
		return this.$.schema(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	// add the extra inferred intersection so that a variable of Type
	// can be narrowed without other branches becoming never
	extends<r>(other: Schema<r>): this is Schema<r> & { [inferred]?: r } {
		const intersection = this.intersect(other as never)
		return (
			!(intersection instanceof Disjoint) &&
			this.equals(intersection as never)
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

	// morph<
	// 	morph extends Morph<this["infer"]>,
	// 	outValidatorSchema extends SchemaDef = never
	// >(
	// 	morph: morph,
	// 	outValidator?: outValidatorSchema
	// ): MorphNode<
	// 	(
	// 		In: distillConstrainableIn<t>
	// 	) => Out<
	// 		[outValidatorSchema] extends [never]
	// 			? inferMorphOut<morph>
	// 			: distillConstrainableOut<
	// 					instantiateSchema<outValidatorSchema, $>["infer"]
	// 				>
	// 	>,
	// 	$
	// >
	// morph(morph: Morph, outValidator?: unknown): unknown {
	// 	if (this.hasKind("union")) {
	// 		const branches = this.branches.map((node) =>
	// 			node.morph(morph, outValidator as never)
	// 		)
	// 		return this.$.node("union", { ...this.inner, branches })
	// 	}
	// 	if (this.hasKind("morph")) {
	// 		return this.$.node("morph", {
	// 			...this.inner,
	// 			morphs: [...this.morphs, morph]
	// 		})
	// 	}
	// 	return this.$.node("morph", {
	// 		in: this,
	// 		morphs: [morph]
	// 	})
	// }

	assert(data: unknown): this["infer"] {
		const result = this.traverse(data)
		return result.errors ? result.errors.throw() : result.out
	}

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeDef<kind>
	>(
		kind: conform<kind, constraintKindOf<this["in"]["infer"]>>,
		def: def
	): Schema<constrain<t, kind, def>> {
		return this.rawConstrain(kind, def) as never
	}

	protected rawConstrain(kind: ConstraintKind, def: unknown): Schema {
		const constraint = this.$.node(kind, def as never)
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

		return this.intersectSatisfiable(
			// TODO: not an intersection
			this.$.node("intersection", {
				[kind]: constraint
			})
		) as never
	}
}

export type intersectSchema<l extends SchemaKind, r extends NodeKind> = [
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

export type schemaKindRightOf<kind extends SchemaKind> = Extract<
	kindRightOf<kind>,
	SchemaKind
>

export type schemaKindOrRightOf<kind extends SchemaKind> =
	| kind
	| schemaKindRightOf<kind>
