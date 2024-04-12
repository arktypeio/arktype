import {
	type Callable,
	type Json,
	type conform,
	flatMorph
} from "@arktype/util"
import type { constrain } from "../constraints/ast.js"
import {
	type PrimitiveConstraintKind,
	throwInvalidOperandError
} from "../constraints/constraint.js"
import type { inferSchema } from "../inference.js"
import type { NodeDef, reducibleKindOf } from "../kinds.js"
import { type Node, RawNode, type SchemaDef } from "../node.js"
import type { SchemaScope } from "../scope.js"
import type { BaseMeta, RawNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkResult } from "../shared/errors.js"
import {
	type NodeAttachments,
	type NodeKind,
	type SchemaKind,
	type TypeIntersection,
	type kindRightOf,
	schemaKindsRightOf
} from "../shared/implement.js"
import type { inferIntersection } from "../shared/intersections.js"
import {
	arkKind,
	type inferred,
	type internalImplementationOf
} from "../shared/utils.js"
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

export interface RawSchemaDeclaration extends RawNodeDeclaration {
	kind: SchemaKind
	attachments: RawSchemaAttachments<this>
}

export interface RawSchemaAttachments<d extends RawNodeDeclaration>
	extends NodeAttachments<d> {
	rawKeyOf(): RawSchema
}

export type UnknownSchema = Schema | RawSchema

export class RawSchema<
		/** @ts-expect-error allow instantiation assignment to the base type */
		out d extends RawSchemaDeclaration = RawSchemaDeclaration
	>
	extends RawNode<d>
	implements
		internalImplementationOf<Schema, (keyof Schema & symbol) | "infer">
{
	readonly branches: readonly Node<UnionChildKind>[] =
		this.hasKind("union") ? this.inner.branches : [this as never];

	readonly [arkKind] = "schema"

	get raw(): this {
		return this
	}

	#keyofCache: RawSchema | undefined
	keyof(): RawSchema {
		if (!this.#keyofCache) {
			this.#keyofCache = this.rawKeyOf()
		}
		return this.#keyofCache as never
	}

	intersect(r: UnknownSchema): RawSchema | Disjoint {
		return this.intersectInternal(r) as never
	}

	intersectSatisfiable(r: UnknownSchema): RawSchema {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	union(r: UnknownSchema): RawSchema
	union(r: RawSchema): RawSchema {
		const branches = [...this.branches, ...(r.branches as any)]
		return this.$.schema(branches) as never
	}

	assert(data: unknown): unknown {
		const result = this.traverse(data)
		return result.errors ? result.errors.throw() : result.out
	}

	// get<key extends PropertyKey>(
	// 	...path: readonly (key | Schema<key>)[]
	// ): this {
	// 	return this
	// }

	extract(other: UnknownSchema): RawSchema {
		return this.$.schema(
			this.branches.filter((branch) => branch.extends(other))
		) as never
	}

	exclude(other: UnknownSchema): RawSchema {
		return this.$.schema(
			this.branches.filter((branch) => !branch.extends(other))
		) as never
	}

	array(): RawSchema {
		return this.$.schema(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	extends(other: UnknownSchema): boolean {
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

	from(literal: unknown): unknown {
		return literal
	}

	morphNode(morph: Morph, outValidator?: unknown): RawSchema {
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

	constrain(kind: PrimitiveConstraintKind, def: unknown): RawSchema {
		const constraint = this.$.node(kind, def)
		if (constraint.impliedBasis && !this.extends(constraint.impliedBasis)) {
			return throwInvalidOperandError(
				kind,
				constraint.impliedBasis as never,
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

export interface Schema<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = any
> extends Callable<(data: unknown) => ArkResult<t>> {
	$: SchemaScope<$>
	infer: distillOut<t>
	[inferred]: t

	json: Json
	description: string
	expression: string
	innerId: string
	raw: RawSchema

	get in(): Schema<distillConstrainableIn<t>, $>

	get out(): Schema<distillConstrainableOut<t>, $>

	assert(data: unknown): this["infer"]

	keyof(): Schema<keyof this["in"]["infer"], $>

	allows(data: unknown): data is this["in"]["infer"]

	traverse(data: unknown): ArkResult<t>

	intersect<r extends Schema>(
		r: r
	): Schema<inferIntersection<this["infer"], r["infer"]>> | Disjoint

	intersectSatisfiable<r extends Schema>(
		r: r
	): Schema<inferIntersection<this["infer"], r["infer"]>>

	union<r extends Schema>(r: r): Schema<t | r["infer"]>

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeDef<kind>
	>(
		kind: conform<kind, constraintKindOf<this["in"]["infer"]>>,
		def: def
	): Schema<constrain<t, kind, def>, $>

	equals<r>(r: Schema<r>): this is Schema<r>

	// TODO: i/o
	extract<r>(r: Schema<r>): Schema<t, $>
	exclude<r>(r: Schema<r>): Schema<t, $>

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
			[outValidatorSchema] extends [never] ? inferMorphOut<morph>
			:	distillConstrainableOut<inferSchema<outValidatorSchema, $>>
		>,
		$
	>
}

export type intersectSchema<l extends SchemaKind, r extends NodeKind> =
	[l, r] extends [r, l] ? l
	:	asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<l extends NodeKind, r extends NodeKind> =
	l extends unknown ?
		r extends kindRightOf<l> ?
			l | reducibleKindOf<l>
		:	never
	:	never

export type schemaKindRightOf<kind extends SchemaKind> = Extract<
	kindRightOf<kind>,
	SchemaKind
>

export type schemaKindOrRightOf<kind extends SchemaKind> =
	| kind
	| schemaKindRightOf<kind>
