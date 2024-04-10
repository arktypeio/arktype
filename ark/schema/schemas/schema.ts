import {
	Hkt,
	type Json,
	type conform,
	flatMorph,
	type instantiate
} from "@arktype/util"
import {
	type BaseAttachments,
	BaseNode,
	type Node,
	type SchemaDef
} from "../base.js"
import type { constrain } from "../constraints/ast.js"
import {
	type PrimitiveConstraintKind,
	throwInvalidOperandError
} from "../constraints/constraint.js"
import type { NodeDef, reducibleKindOf } from "../kinds.js"
import type { inferSchema } from "../parser/inference.js"
import type { SchemaScope } from "../scope.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	type NodeKind,
	type SchemaKind,
	type TypeIntersection,
	type kindRightOf,
	schemaKindsRightOf
} from "../shared/implement.js"
import { arkKind, type inferred } from "../shared/utils.js"
import type { constraintKindOf } from "./intersection.js"
import type {
	Morph,
	Out,
	distillConstrainableIn,
	distillConstrainableOut,
	distillOut,
	inferMorphOut
} from "./morph.js"
import type { UnionChildKind } from "./union.js"

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
	rawKeyOf(): BaseSchema
}

export interface Schema<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = any
> {
	$: SchemaScope<$>
	infer: distillOut<t>
	[inferred]: t
	[Hkt.args]: [t: unknown, $: unknown]
	[Hkt.instantiate]: (
		args: this[Hkt.args]
	) => Schema<(typeof args)[0], (typeof args)[1]>

	json: Json
	description: string
	expression: string

	get in(): Schema<distillConstrainableIn<t>, $>

	get out(): Schema<distillConstrainableOut<t>, $>

	assert(data: unknown): this["infer"]

	keyof(): Schema<keyof this["in"]["infer"], $>

	allows(data: unknown): data is this["in"]["infer"]

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeDef<kind>
	>(
		kind: conform<kind, constraintKindOf<this["in"]["infer"]>>,
		def: def
	): instantiate<this, [constrain<t, kind, def>, $]>

	// TODO: i/o
	extract(other: BaseSchema): Schema<t, $>

	// TODO: i/o
	exclude(other: BaseSchema): Schema<t, $>

	array(): Schema<t[], $>

	// add the extra inferred intersection so that a variable of Type
	// can be narrowed without other branches becoming never
	extends<r>(other: Schema<r>): this is Schema<r> & { [inferred]?: r }

	configure(configOrDescription: BaseMeta | string): this

	describe(description: string): this

	from(literal: this["in"]["infer"]): this["out"]["infer"]

	morphNode<
		morph extends Morph<this["infer"]>,
		outValidatorSchema extends SchemaDef = never
	>(
		morph: morph,
		outValidator?: outValidatorSchema
	): Schema<
		(
			In: distillConstrainableIn<t>
		) => Out<
			[outValidatorSchema] extends [never]
				? inferMorphOut<morph>
				: distillConstrainableOut<inferSchema<outValidatorSchema, $>>
		>,
		$
	>
}

type implementedSchemaKey = Exclude<keyof Schema, symbol | "infer">

export type SchemaProps = {
	// ensure functions accept compatible numbers of args
	[k in implementedSchemaKey]: Schema[k] extends (
		...args: infer args
	) => unknown
		? (...args: { [i in keyof args]: never }) => unknown
		: unknown
}

export class BaseSchema<
		/** @ts-expect-error allow instantiation assignment to the base type */
		out d extends BaseSchemaDeclaration = BaseSchemaDeclaration
	>
	extends BaseNode<unknown, d>
	implements SchemaProps
{
	readonly branches: readonly Node<UnionChildKind>[] = this.hasKind("union")
		? this.inner.branches
		: [this as never]

	readonly [arkKind] = "schema"

	#keyofCache: BaseSchema | undefined
	keyof(): BaseSchema {
		// if (!this.#keyofCache) {
		// 	this.#keyofCache = this.rawKeyOf()
		// 	if (this.#keyofCache.isNever())
		// 		throwParseError(
		// 			`keyof ${this.expression} results in an unsatisfiable type`
		// 		)
		// }
		return this.#keyofCache as never
	}

	intersect(r: BaseSchema): BaseSchema | Disjoint {
		return this.intersectInternal(r) as never
	}

	intersectSatisfiable(r: BaseSchema): BaseSchema {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	union(r: BaseSchema): BaseSchema {
		const branches = [...this.branches, ...(r.branches as any)]
		return this.$.schema(branches) as never
	}

	assert(data: unknown) {
		const result = this.traverse(data)
		return result.errors ? result.errors.throw() : result.out
	}

	// get<key extends PropertyKey>(
	// 	...path: readonly (key | Schema<key>)[]
	// ): this {
	// 	return this
	// }

	// TODO: i/o
	extract(other: BaseSchema): BaseSchema {
		return this.$.schema(
			this.branches.filter((branch) => branch.extends(other))
		) as never
	}

	// TODO: i/o
	exclude(other: BaseSchema): BaseSchema {
		return this.$.schema(
			this.branches.filter((branch) => !branch.extends(other))
		) as never
	}

	array(): BaseSchema {
		return this.$.schema(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	extends(other: BaseSchema) {
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

	from(literal: this["in"]["infer"]): this["out"]["infer"] {
		return literal as never
	}

	morphNode(morph: Morph, outValidator?: unknown): BaseSchema {
		if (this.hasKind("union")) {
			const branches = this.branches.map((node) =>
				node.morphNode(morph, outValidator as never)
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

	constrain(kind: PrimitiveConstraintKind, def: unknown): BaseSchema {
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
