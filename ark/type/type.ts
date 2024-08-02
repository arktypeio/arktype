import {
	ArkErrors,
	BaseRoot,
	GenericRoot,
	type BaseMeta,
	type Disjoint,
	type Morph,
	type Predicate,
	type UndeclaredKeyBehavior
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
import type {
	MorphAst,
	Out,
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
import type { ArrayType } from "./subtypes/array.js"
import type { DateType } from "./subtypes/date.js"
import type { MorphType } from "./subtypes/morph.js"
import type { NumberType } from "./subtypes/number.js"
import type { ObjectType } from "./subtypes/object.js"
import type { StringType } from "./subtypes/string.js"

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

/** @ts-ignore cast variance */
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

	array(): ArrayType<t[], $>

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
	): instantiateType<
		t extends MorphAst ?
			inferPredicate<this["tOut"], predicate> extends infer narrowed ?
				(In: this["tIn"]) => Out<narrowed>
			:	never
		:	inferPredicate<t, predicate>,
		$
	>

	equals<def>(
		def: validateTypeRoot<def, $>
	): this is instantiateType<inferTypeRoot<def, $>, $>

	extract<def>(
		r: validateTypeRoot<def, $>
	): instantiateType<Extract<t, inferTypeRoot<def, $>>, $>

	exclude<def>(
		r: validateTypeRoot<def, $>
	): instantiateType<Exclude<t, inferTypeRoot<def, $>>, $>

	extends<def>(
		other: validateTypeRoot<def, $>
	): this is instantiateType<inferTypeRoot<def, $>, $>

	overlaps<def>(r: validateTypeRoot<def, $>): boolean

	satisfying<predicate extends Predicate<distillIn<t>>>(
		predicate: predicate
	): instantiateType<
		t extends MorphAst ?
			(In: inferPredicate<this["tIn"], predicate>) => Out<this["tOut"]>
		:	inferPredicate<t, predicate>,
		$
	>

	keyof(): instantiateType<keyof t, $>

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

	// TS suggests Symbol to allow builtin symbolic access, so override that as well
	/** @deprecated */
	Symbol: never
}

export declare namespace Type {
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
		[t] extends [string] ? StringType<t, $>
		: [t] extends [number] ? NumberType<t, $>
		: [t] extends [object] ?
			[t] extends [array] ? ArrayType<t, $>
			: [t] extends [Date] ? DateType<t, $>
			: ObjectType<t, $>
		:	Type<t, $>
	:	MorphType<t, $>

type validateChainedAsArgs<t> =
	[t] extends [unset] ?
		[t] extends [anyOrNever] ?
			[]
		:	[
				ErrorMessage<"as requires an explicit type parameter like myType.as<t>()">
			]
	:	[]
