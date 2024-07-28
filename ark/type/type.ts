import {
	ArkErrors,
	BaseRoot,
	GenericRoot,
	type BaseMeta,
	type Disjoint,
	type DivisorSchema,
	type ExactLengthSchema,
	type ExclusiveDateRangeSchema,
	type ExclusiveNumericRangeSchema,
	type InclusiveDateRangeSchema,
	type InclusiveNumericRangeSchema,
	type Morph,
	type MorphAst,
	type NodeSchema,
	type Out,
	type PatternSchema,
	type Predicate,
	type PrimitiveConstraintKind,
	type Root,
	type arkKeyOf,
	type constrain,
	type constraintKindOf,
	type distillIn,
	type distillOut,
	type exclusivizeRangeSchema,
	type getArkKey,
	type inferIntersection,
	type inferMorphOut,
	type inferPipes,
	type inferPredicate,
	type toArkKey,
	type validateChainedAsArgs,
	type validateChainedConstraint,
	type validateStructuralOperand
} from "@ark/schema"
import {
	Callable,
	type Constructor,
	type array,
	type conform,
	type unset
} from "@ark/util"
import type { type } from "./ark.js"
import {
	parseGenericParams,
	type Generic,
	type ParameterString,
	type baseGenericConstraints,
	type parseValidGenericParams,
	type validateParameterString
} from "./generic.js"
import type {
	inferDefinition,
	validateDeclared,
	validateDefinition
} from "./parser/definition.js"
import type {
	IndexOneOperator,
	IndexZeroOperator,
	TupleInfixOperator
} from "./parser/tuple.js"
import type { InternalScope, Scope, bindThis } from "./scope.js"

/** The convenience properties attached to `type` */
export type TypeParserAttachments =
	// map over to remove call signatures
	Omit<TypeParser, never>

export interface TypeParser<$ = {}> {
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def, t = instantiateType<inferTypeRoot<def, $>, $>>(
		def: validateTypeRoot<def, $>
	): t

	// Spread version of a tuple expression
	<
		const zero,
		const one,
		const rest extends array,
		t = Data<inferTypeRoot<[zero, one, ...rest], $>, $>
	>(
		_0: zero extends IndexZeroOperator ? zero : validateTypeRoot<zero, $>,
		_1: zero extends "keyof" ? validateTypeRoot<one, $>
		: zero extends "instanceof" ? conform<one, Constructor>
		: zero extends "===" ? conform<one, unknown>
		: conform<one, IndexOneOperator>,
		..._2: zero extends "===" ? rest
		: zero extends "instanceof" ? conform<rest, readonly Constructor[]>
		: one extends TupleInfixOperator ?
			one extends ":" ? [Predicate<distillIn<inferTypeRoot<zero, $>>>]
			: one extends "=>" ? [Morph<distillOut<inferTypeRoot<zero, $>>, unknown>]
			: one extends "@" ? [string | BaseMeta]
			: [validateTypeRoot<rest[0], $>]
		:	[]
	): t

	<params extends ParameterString, const def>(
		params: validateParameterString<params, $>,
		def: validateDefinition<
			def,
			$,
			baseGenericConstraints<parseValidGenericParams<params, $>>
		>
	): Generic<parseValidGenericParams<params, $>, def, $>

	raw(def: unknown): Type<any, $>
	errors: typeof ArkErrors
}

export class InternalTypeParser extends Callable<
	(...args: unknown[]) => BaseRoot | Generic,
	TypeParserAttachments
> {
	constructor($: InternalScope) {
		super(
			(...args) => {
				if (args.length === 1) {
					// treat as a simple definition
					return $.parseRoot(args[0])
				}
				if (
					args.length === 2 &&
					typeof args[0] === "string" &&
					args[0][0] === "<" &&
					args[0].at(-1) === ">"
				) {
					// if there are exactly two args, the first of which looks like <${string}>,
					// treat as a generic
					const params = parseGenericParams(args[0].slice(1, -1), {
						$,
						args: {}
					})

					return new GenericRoot(
						params,
						args[1],
						$ as never,
						$ as never
					) as never
				}
				// otherwise, treat as a tuple expression. technically, this also allows
				// non-expression tuple definitions to be parsed, but it's not a supported
				// part of the API as specified by the associated types
				return $.parseRoot(args)
			},
			{
				bind: $,
				attach: {
					errors: ArkErrors,
					raw: $.parseRoot as never
				}
			}
		)
	}
}

export type DeclarationParser<$> = <preinferred>() => {
	// for some reason, making this a const parameter breaks preinferred validation
	type: <def>(
		def: validateDeclared<preinferred, def, $, bindThis<def>>
	) => Data<preinferred, $>
}

// this is declared as a class internally so we can ensure all "abstract"
// methods of BaseRoot are overridden, but we end up exporting it as an interface
// to ensure it is not accessed as a runtime value
declare class _Type<t = unknown, $ = {}> extends Root<t, $> {
	$: Scope<$>

	as<t = unset>(...args: validateChainedAsArgs<t>): Data<t, $>

	get in(): Data<this["tIn"], $>
	get out(): Data<this["tOut"], $>

	intersect<def>(
		def: validateTypeRoot<def, $>
	): Data<inferIntersection<t, inferTypeRoot<def, $>>> | Disjoint

	and<def>(
		def: validateTypeRoot<def, $>
	): Data<inferIntersection<t, inferTypeRoot<def, $>>, $>

	or<def>(def: validateTypeRoot<def, $>): Data<t | inferTypeRoot<def, $>, $>

	array(): Data<t[], $>

	pipe<a extends Morph<this["infer"]>>(a: a): Data<inferPipes<t, [a]>, $>
	pipe<a extends Morph<this["infer"]>, b extends Morph<inferMorphOut<a>>>(
		a: a,
		b: b
	): Data<inferPipes<t, [a, b]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>
	>(a: a, b: b, c: c): Data<inferPipes<t, [a, b, c]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>
	>(a: a, b: b, c: c, d: d): Data<inferPipes<t, [a, b, c, d]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>
	>(a: a, b: b, c: c, d: d, e: e): Data<inferPipes<t, [a, b, c, d, e]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f
	): Data<inferPipes<t, [a, b, c, d, e, f]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g
	): Data<inferPipes<t, [a, b, c, d, e, f, g]>, $>

	narrow<predicate extends Predicate<distillOut<t>>>(
		predicate: predicate
	): Data<
		t extends MorphAst ?
			inferPredicate<this["tOut"], predicate> extends infer narrowed ?
				(In: this["tIn"]) => Out<narrowed>
			:	never
		:	inferPredicate<t, predicate>,
		$
	>

	equals<def>(
		def: validateTypeRoot<def, $>
	): this is Data<inferTypeRoot<def, $>, $>

	extract<def>(
		r: validateTypeRoot<def, $>
	): Data<Extract<t, inferTypeRoot<def, $>>, $>

	exclude<def>(
		r: validateTypeRoot<def, $>
	): Data<Exclude<t, inferTypeRoot<def, $>>, $>

	extends<def>(
		other: validateTypeRoot<def, $>
	): this is Data<inferTypeRoot<def, $>, $>

	overlaps<def>(r: validateTypeRoot<def, $>): boolean

	satisfying<predicate extends Predicate<distillIn<t>>>(
		predicate: predicate
	): Data<
		t extends MorphAst ?
			(In: inferPredicate<this["tIn"], predicate>) => Out<this["tOut"]>
		:	inferPredicate<t, predicate>,
		$
	>
}

export interface Type<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = {}
> extends _Type<t, $> {}

export interface Data<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = {}
> extends Type<t, $> {
	keyof(): Data<keyof t, $>

	get<k1 extends arkKeyOf<t>>(k1: k1 | type.cast<k1>): Data<getArkKey<t, k1>, $>
	get<k1 extends arkKeyOf<t>, k2 extends arkKeyOf<getArkKey<t, k1>>>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>
	): Data<getArkKey<getArkKey<t, k1>, k2>, $>
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<getArkKey<t, k1>>,
		k3 extends arkKeyOf<getArkKey<getArkKey<t, k1>, k2>>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>,
		k3: k3 | type.cast<k3>
	): Data<getArkKey<getArkKey<getArkKey<t, k1>, k2>, k3>, $>

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeSchema<kind>
	>(
		kind: conform<kind, constraintKindOf<this["inferIn"]>>,
		def: def
	): Data<constrain<t, kind, def>, $>

	pick<const key extends arkKeyOf<t> = never>(
		this: validateStructuralOperand<"pick", t>,
		...keys: (key | type.cast<key>)[]
	): Data<
		{
			[k in keyof t as Extract<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	omit<const key extends arkKeyOf<t> = never>(
		this: validateStructuralOperand<"omit", t>,
		...keys: (key | type.cast<key>)[]
	): Data<
		{
			[k in keyof t as Exclude<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	required(
		this: validateStructuralOperand<"required", t>
	): Data<{ [k in keyof t]-?: t[k] }, $>

	partial(
		this: validateStructuralOperand<"partial", t>
	): Data<{ [k in keyof t]?: t[k] }, $>

	divisibleBy<const schema extends DivisorSchema>(
		this: validateChainedConstraint<"divisor", t>,
		schema: schema
	): Data<constrain<t, "divisor", schema>, $>

	matching<const schema extends PatternSchema>(
		this: validateChainedConstraint<"pattern", t>,
		schema: schema
	): Data<constrain<t, "pattern", schema>, $>

	atLeast<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"min", t>,
		schema: schema
	): Data<constrain<t, "min", schema>, $>

	atMost<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"max", t>,
		schema: schema
	): Data<constrain<t, "max", schema>, $>

	moreThan<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"min", t>,
		schema: schema
	): Data<constrain<t, "min", exclusivizeRangeSchema<schema>>, $>

	lessThan<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"max", t>,
		schema: schema
	): Data<constrain<t, "max", exclusivizeRangeSchema<schema>>, $>

	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"minLength", t>,
		schema: schema
	): Data<constrain<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"maxLength", t>,
		schema: schema
	): Data<constrain<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"minLength", t>,
		schema: schema
	): Data<constrain<t, "minLength", exclusivizeRangeSchema<schema>>, $>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"maxLength", t>,
		schema: schema
	): Data<constrain<t, "maxLength", exclusivizeRangeSchema<schema>>, $>

	exactlyLength<const schema extends ExactLengthSchema>(
		this: validateChainedConstraint<"exactLength", t>,
		schema: schema
	): Data<constrain<t, "exactLength", schema>, $>

	atOrAfter<const schema extends InclusiveDateRangeSchema>(
		this: validateChainedConstraint<"after", t>,
		schema: schema
	): Data<constrain<t, "after", schema>, $>

	atOrBefore<const schema extends InclusiveDateRangeSchema>(
		this: validateChainedConstraint<"before", t>,
		schema: schema
	): Data<constrain<t, "before", schema>, $>

	laterThan<const schema extends ExclusiveDateRangeSchema>(
		this: validateChainedConstraint<"after", t>,
		schema: schema
	): Data<constrain<t, "after", exclusivizeRangeSchema<schema>>, $>

	earlierThan<const schema extends ExclusiveDateRangeSchema>(
		this: validateChainedConstraint<"before", t>,
		schema: schema
	): Data<constrain<t, "before", exclusivizeRangeSchema<schema>>, $>
}

export type TypeConstructor<t = unknown, $ = {}> = new (
	def: unknown,
	$: Scope<$>
) => Data<t, $>

export type AnyType<out t = unknown> = Data<t, any>

export const Type: TypeConstructor = BaseRoot as never

export type DefinitionParser<$> = <def>(def: validateTypeRoot<def, $>) => def

export type validateTypeRoot<def, $ = {}> = validateDefinition<
	def,
	$,
	bindThis<def>
>

export type inferTypeRoot<def, $> = inferDefinition<def, $, bindThis<def>>

export type validateAmbient<def> = validateTypeRoot<def, {}>

export type inferAmbient<def> = inferTypeRoot<def, {}>

export type instantiateType<t, $> =
	[t] extends [MorphAst] ? Type<t, $> : Data<t, $>

// [t] extends [anyOrNever] ? Data<t, $>
// : [t] extends [MorphAst] ? Type<t, $>
// : Data<t, $>
