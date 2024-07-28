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
	type anyOrNever,
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
	<const def, r = instantiateType<inferTypeRoot<def, $>, $>>(
		def: validateTypeRoot<def, $>
	): r

	// Spread version of a tuple expression
	<
		const zero,
		const one,
		const rest extends array,
		r = instantiateType<inferTypeRoot<[zero, one, ...rest], $>, $>
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
	): r

	<params extends ParameterString, const def>(
		params: validateParameterString<params, $>,
		def: validateDefinition<
			def,
			$,
			baseGenericConstraints<parseValidGenericParams<params, $>>
		>
	): Generic<parseValidGenericParams<params, $>, def, $>

	raw(def: unknown): BaseType<any, $>
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
	) => Type<preinferred, $>
}

// this is declared as a class internally so we can ensure all "abstract"
// methods of BaseRoot are overridden, but we end up exporting it as an interface
// to ensure it is not accessed as a runtime value
declare abstract class _Type<t = unknown, $ = {}> extends Root<t, $> {
	$: Scope<$>

	as<t = unset>(...args: validateChainedAsArgs<t>): Type<t, $>

	get in(): Type<this["tIn"], $>
	get out(): Type<this["tOut"], $>

	intersect<const def, r = inferTypeRoot<def, $>>(
		def: validateTypeRoot<def, $>
	): instantiateType<inferIntersection<t, r>, $> | Disjoint

	// these defaulted params are split up to optimize
	// type perf while maintaining accurate inference for test cases
	// like "nested 'and' chained from morph on optional"
	and<const def, r = inferTypeRoot<def, $>>(
		def: validateTypeRoot<def, $>
	): instantiateType<inferIntersection<t, r>, $>

	or<const def, r = inferTypeRoot<def, $>>(
		def: validateTypeRoot<def, $>
	): instantiateType<t | r, $>

	array(): Type<t[], $>

	pipe<
		a extends Morph<this["infer"]>,
		r = instantiateType<inferPipes<t, [a]>, $>
	>(a: a): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferPipes<t, [a, b]>, $>
	>(a: a, b: b): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferPipes<t, [a, b, c]>, $>
	>(a: a, b: b, c: c): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		r = instantiateType<inferPipes<t, [a, b, c, d]>, $>
	>(a: a, b: b, c: c, d: d): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e]>, $>
	>(a: a, b: b, c: c, d: d, e: e): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e, f]>, $>
	>(a: a, b: b, c: c, d: d, e: e, f: f): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e, f, g]>, $>
	>(a: a, b: b, c: c, d: d, e: e, f: f, g: g): r

	narrow<predicate extends Predicate<distillOut<t>>>(
		predicate: predicate
	): Type<
		t extends MorphAst ?
			inferPredicate<this["tOut"], predicate> extends infer narrowed ?
				(In: this["tIn"]) => Out<narrowed>
			:	never
		:	inferPredicate<t, predicate>,
		$
	>

	equals<def>(
		def: validateTypeRoot<def, $>
	): this is Type<inferTypeRoot<def, $>, $>

	extract<def>(
		r: validateTypeRoot<def, $>
	): Type<Extract<t, inferTypeRoot<def, $>>, $>

	exclude<def>(
		r: validateTypeRoot<def, $>
	): Type<Exclude<t, inferTypeRoot<def, $>>, $>

	extends<def>(
		other: validateTypeRoot<def, $>
	): this is Type<inferTypeRoot<def, $>, $>

	overlaps<def>(r: validateTypeRoot<def, $>): boolean

	satisfying<predicate extends Predicate<distillIn<t>>>(
		predicate: predicate
	): Type<
		t extends MorphAst ?
			(In: inferPredicate<this["tIn"], predicate>) => Out<this["tOut"]>
		:	inferPredicate<t, predicate>,
		$
	>
}

export interface BaseType<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = {}
> extends _Type<t, $> {}

export interface MorphType<
	/** @ts-expect-error cast variance */
	out t = unknown,
	$ = {}
> extends BaseType<t, $> {}

export interface Type<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = {}
> extends BaseType<t, $> {
	keyof(): Type<keyof t, $>

	get<k1 extends arkKeyOf<t>, r = instantiateType<getArkKey<t, k1>, $>>(
		k1: k1 | type.cast<k1>
	): r
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<getArkKey<t, k1>>,
		r = instantiateType<getArkKey<getArkKey<t, k1>, k2>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>
	): r
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<getArkKey<t, k1>>,
		k3 extends arkKeyOf<getArkKey<getArkKey<t, k1>, k2>>,
		r = instantiateType<getArkKey<getArkKey<getArkKey<t, k1>, k2>, k3>, $>
	>(
		k1: k1 | type.cast<k1>,
		k2: k2 | type.cast<k2>,
		k3: k3 | type.cast<k3>
	): r

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeSchema<kind>
	>(
		kind: conform<kind, constraintKindOf<this["inferIn"]>>,
		def: def
	): Type<constrain<t, kind, def>, $>

	pick<const key extends arkKeyOf<t> = never>(
		this: validateStructuralOperand<"pick", t>,
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Extract<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	omit<const key extends arkKeyOf<t> = never>(
		this: validateStructuralOperand<"omit", t>,
		...keys: (key | type.cast<key>)[]
	): Type<
		{
			[k in keyof t as Exclude<toArkKey<t, k>, key>]: t[k]
		},
		$
	>

	required(
		this: validateStructuralOperand<"required", t>
	): Type<{ [k in keyof t]-?: t[k] }, $>

	partial(
		this: validateStructuralOperand<"partial", t>
	): Type<{ [k in keyof t]?: t[k] }, $>

	divisibleBy<const schema extends DivisorSchema>(
		this: validateChainedConstraint<"divisor", t>,
		schema: schema
	): Type<constrain<t, "divisor", schema>, $>

	matching<const schema extends PatternSchema>(
		this: validateChainedConstraint<"pattern", t>,
		schema: schema
	): Type<constrain<t, "pattern", schema>, $>

	atLeast<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"min", t>,
		schema: schema
	): Type<constrain<t, "min", schema>, $>

	atMost<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"max", t>,
		schema: schema
	): Type<constrain<t, "max", schema>, $>

	moreThan<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"min", t>,
		schema: schema
	): Type<constrain<t, "min", exclusivizeRangeSchema<schema>>, $>

	lessThan<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"max", t>,
		schema: schema
	): Type<constrain<t, "max", exclusivizeRangeSchema<schema>>, $>

	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"minLength", t>,
		schema: schema
	): Type<constrain<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"maxLength", t>,
		schema: schema
	): Type<constrain<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"minLength", t>,
		schema: schema
	): Type<constrain<t, "minLength", exclusivizeRangeSchema<schema>>, $>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		this: validateChainedConstraint<"maxLength", t>,
		schema: schema
	): Type<constrain<t, "maxLength", exclusivizeRangeSchema<schema>>, $>

	exactlyLength<const schema extends ExactLengthSchema>(
		this: validateChainedConstraint<"exactLength", t>,
		schema: schema
	): Type<constrain<t, "exactLength", schema>, $>

	atOrAfter<const schema extends InclusiveDateRangeSchema>(
		this: validateChainedConstraint<"after", t>,
		schema: schema
	): Type<constrain<t, "after", schema>, $>

	atOrBefore<const schema extends InclusiveDateRangeSchema>(
		this: validateChainedConstraint<"before", t>,
		schema: schema
	): Type<constrain<t, "before", schema>, $>

	laterThan<const schema extends ExclusiveDateRangeSchema>(
		this: validateChainedConstraint<"after", t>,
		schema: schema
	): Type<constrain<t, "after", exclusivizeRangeSchema<schema>>, $>

	earlierThan<const schema extends ExclusiveDateRangeSchema>(
		this: validateChainedConstraint<"before", t>,
		schema: schema
	): Type<constrain<t, "before", exclusivizeRangeSchema<schema>>, $>
}

export type TypeConstructor<t = unknown, $ = {}> = new (
	def: unknown,
	$: Scope<$>
) => Type<t, $>

export type AnyType<out t = unknown> = BaseType<t, any>

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
	// if any branch of t is a MorphAst, instantiate it as a MorphType
	Extract<t, MorphAst> extends anyOrNever ? Type<t, $> : MorphType<t, $>
