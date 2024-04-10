import type { Callable, Hkt, Json, conform } from "@arktype/util"
import type { SchemaDef } from "../base.js"
import type { constrain } from "../constraints/ast.js"
import type { PrimitiveConstraintKind } from "../constraints/constraint.js"
import type { NodeDef } from "../kinds.js"
import type { constraintKindOf } from "../schemas/intersection.js"
import type {
	Morph,
	Out,
	distillConstrainableIn,
	distillConstrainableOut,
	distillOut,
	inferMorphOut
} from "../schemas/morph.js"
import type { RawScope } from "../scope.js"
import type { BaseMeta } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type { ArkResult } from "../shared/errors.js"
import type { inferIntersection } from "../shared/intersections.js"
import type { inferred } from "../shared/utils.js"
import type { inferSchema } from "./inference.js"

export interface Schema<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = any
> extends Callable<(data: unknown) => ArkResult<t>> {
	$: RawScope<$>
	infer: distillOut<t>
	[inferred]: t
	[Hkt.args]: [t: unknown, $: unknown]
	[Hkt.instantiate]: (
		args: this[Hkt.args]
	) => Schema<(typeof args)[0], (typeof args)[1]>

	json: Json
	description: string
	expression: string
	innerId: string

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
			[outValidatorSchema] extends [never]
				? inferMorphOut<morph>
				: distillConstrainableOut<inferSchema<outValidatorSchema, $>>
		>,
		$
	>
}
