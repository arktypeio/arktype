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
	type PatternSchema,
	type Predicate,
	type UndeclaredKeyBehavior,
	type exclusivizeRangeSchema
} from "@ark/schema"
import {
	Callable,
	type Constructor,
	type ErrorMessage,
	type Json,
	type anyOrNever,
	type array,
	type conform,
	type unset
} from "@ark/util"
import type { type } from "./ark.js"
import type {
	MorphAst,
	Out,
	constrain,
	distillConstrainableIn,
	distillConstrainableOut,
	distillIn,
	distillOut,
	inferMorphOut,
	inferPipes,
	inferPredicate,
	inferred
} from "./ast.js"
import {
	parseGenericParams,
	type Generic,
	type ParameterString,
	type baseGenericConstraints,
	type parseValidGenericParams,
	type validateParameterString
} from "./generic.js"
import type { inferIntersection } from "./intersect.js"
import type { arkKeyOf, getArkKey, toArkKey } from "./keys.js"
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

	<params extends ParameterString, const def>(
		params: validateParameterString<params, $>,
		def: validateDefinition<
			def,
			$,
			baseGenericConstraints<parseValidGenericParams<params, $>>
		>
	): Generic<parseValidGenericParams<params, $>, def, $>

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
	type: <const def>(
		def: validateDeclared<preinferred, def, $, bindThis<def>>
	) => instantiateType<preinferred, $>
}

/** @ts-expect-error cast variance */
export interface Type<out t = unknown, $ = {}>
	extends Callable<(data: unknown) => distillOut<t> | ArkErrors> {
	t: t
	tIn: distillConstrainableIn<t>
	tOut: distillConstrainableOut<t>
	infer: distillOut<t>
	inferIn: distillIn<t>
	[inferred]: t

	json: Json
	description: string
	expression: string
	internal: BaseRoot
	$: Scope<$>

	assert(data: unknown): this["infer"]

	allows(data: unknown): data is this["inferIn"]

	traverse(data: unknown): distillOut<t> | ArkErrors

	configure(configOrDescription: BaseMeta | string): this

	describe(description: string): this

	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	from(literal: this["inferIn"]): this["infer"]

	as<t = unset>(...args: validateChainedAsArgs<t>): instantiateType<t, $>

	get in(): instantiateType<this["tIn"], $>
	get out(): instantiateType<this["tOut"], $>

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

	array(): Type.Array<t[], $>

	pipe<
		a extends Morph<this["infer"]>,
		r = instantiateType<inferPipes<t, [a]>, $>
	>(
		a: a
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferPipes<t, [a, b]>, $>
	>(
		a: a,
		b: b
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferPipes<t, [a, b, c]>, $>
	>(
		a: a,
		b: b,
		c: c
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		r = instantiateType<inferPipes<t, [a, b, c, d]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e, f]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f
	): r
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		r = instantiateType<inferPipes<t, [a, b, c, d, e, f, g]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g
	): r

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

	keyof(): Type<keyof t, $>

	// deprecate Function methods so they are deprioritized as suggestions

	/** @deprecated */
	apply: Function["apply"]

	/** @deprecated */
	bind: Function["bind"]

	/** @deprecated */
	call: Function["call"]

	/** @deprecated */
	caller: Function

	/** @deprecated */
	length: number

	/** @deprecated */
	name: string

	/** @deprecated */
	prototype: Function["prototype"]

	/** @deprecated */
	arguments: Function["arguments"]

	// I don't know why Symbol is suggested as a key of a function instance,
	// but applying the same method to that
	/** @deprecated */
	Symbol: never
}

export declare namespace Type {
	/** @ts-ignore cast variance */
	export interface Morph<out t = unknown, $ = {}> extends Type<t, $> {}

	/** @ts-ignore cast variance */
	export interface Object<out t extends object = object, $ = {}>
		extends Type<t, $> {
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

		pick<const key extends arkKeyOf<t> = never>(
			...keys: (key | type.cast<key>)[]
		): Type.Object<
			{
				[k in keyof t as Extract<toArkKey<t, k>, key>]: t[k]
			},
			$
		>

		omit<const key extends arkKeyOf<t> = never>(
			...keys: (key | type.cast<key>)[]
		): Type.Object<
			{
				[k in keyof t as Exclude<toArkKey<t, k>, key>]: t[k]
			},
			$
		>

		required(): Type.Object<{ [k in keyof t]-?: t[k] }, $>

		partial(): Type.Object<{ [k in keyof t]?: t[k] }, $>
	}

	/** @ts-ignore cast variance */
	export interface Number<out t extends number = number, $ = {}>
		extends Type<t, $> {
		divisibleBy<const schema extends DivisorSchema>(
			schema: schema
		): Type.Number<constrain<t, "divisor", schema>, $>

		atLeast<const schema extends InclusiveNumericRangeSchema>(
			schema: schema
		): Type.Number<constrain<t, "min", schema>, $>

		atMost<const schema extends InclusiveNumericRangeSchema>(
			schema: schema
		): Type.Number<constrain<t, "max", schema>, $>

		moreThan<const schema extends ExclusiveNumericRangeSchema>(
			schema: schema
		): Type.Number<constrain<t, "min", exclusivizeRangeSchema<schema>>, $>

		lessThan<const schema extends ExclusiveNumericRangeSchema>(
			schema: schema
		): Type.Number<constrain<t, "max", exclusivizeRangeSchema<schema>>, $>
	}

	/** @ts-ignore cast variance */
	export interface String<out t extends string = string, $ = {}>
		extends Type<t, $> {
		matching<const schema extends PatternSchema>(
			schema: schema
		): Type.String<constrain<t, "pattern", schema>, $>

		atLeastLength<const schema extends InclusiveNumericRangeSchema>(
			schema: schema
		): Type.String<constrain<t, "minLength", schema>, $>

		atMostLength<const schema extends InclusiveNumericRangeSchema>(
			schema: schema
		): Type.String<constrain<t, "maxLength", schema>, $>

		moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
			schema: schema
		): Type.String<constrain<t, "minLength", exclusivizeRangeSchema<schema>>, $>

		lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
			schema: schema
		): Type.String<constrain<t, "maxLength", exclusivizeRangeSchema<schema>>, $>

		exactlyLength<const schema extends ExactLengthSchema>(
			schema: schema
		): Type.String<constrain<t, "exactLength", schema>, $>
	}

	/** @ts-ignore cast variance */
	export interface Array<out t extends array = array, $ = {}>
		extends Type.Object<t, $> {
		atLeastLength<const schema extends InclusiveNumericRangeSchema>(
			schema: schema
		): Type.Array<constrain<t, "minLength", schema>, $>

		atMostLength<const schema extends InclusiveNumericRangeSchema>(
			schema: schema
		): Type.Array<constrain<t, "maxLength", schema>, $>

		moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
			schema: schema
		): Type.Array<constrain<t, "minLength", exclusivizeRangeSchema<schema>>, $>

		lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
			schema: schema
		): Type.Array<constrain<t, "maxLength", exclusivizeRangeSchema<schema>>, $>

		exactlyLength<const schema extends ExactLengthSchema>(
			schema: schema
		): Type.Array<constrain<t, "exactLength", schema>, $>
	}

	/** @ts-ignore cast variance */
	export interface Date<out t extends globalThis.Date = globalThis.Date, $ = {}>
		extends Type.Object<t, $> {
		atOrAfter<const schema extends InclusiveDateRangeSchema>(
			schema: schema
		): Type.Date<constrain<t, "after", schema>, $>

		atOrBefore<const schema extends InclusiveDateRangeSchema>(
			schema: schema
		): Type.Date<constrain<t, "before", schema>, $>

		laterThan<const schema extends ExclusiveDateRangeSchema>(
			schema: schema
		): Type.Date<constrain<t, "after", exclusivizeRangeSchema<schema>>, $>

		earlierThan<const schema extends ExclusiveDateRangeSchema>(
			schema: schema
		): Type.Date<constrain<t, "before", exclusivizeRangeSchema<schema>>, $>
	}

	/** @ts-ignore cast variance */
	export type Any<out t = any> = Type<t, any>
}

export type TypeConstructor<t = unknown, $ = {}> = new (
	def: unknown,
	$: Scope<$>
) => Type<t, $>

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
	Extract<t, MorphAst> extends anyOrNever ?
		// otherwise, all branches have to conform to a single basis type those methods to be available
		[t] extends [string] ? Type.String<t, $>
		: [t] extends [number] ? Type.Number<t, $>
		: [t] extends [object] ?
			[t] extends [array] ? Type.Array<t, $>
			: [t] extends [Date] ? Type.Date<t, $>
			: Type.Object<t, $>
		:	Type<t, $>
	:	Type.Morph<t, $>

export type validateChainedAsArgs<t> =
	[t] extends [unset] ?
		[t] extends [anyOrNever] ?
			[]
		:	[
				ErrorMessage<"as requires an explicit type parameter like myType.as<t>()">
			]
	:	[]
