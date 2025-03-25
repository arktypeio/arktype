import {
	ArkErrors,
	BaseRoot,
	GenericRoot,
	type BaseParseOptions,
	type Morph,
	type Predicate,
	type RootSchema,
	type TypeMeta
} from "@ark/schema"
import {
	Callable,
	Hkt,
	type Constructor,
	type array,
	type conform
} from "@ark/util"
import type { distill, inferIntersection } from "./attributes.ts"
import type {
	Generic,
	GenericParser,
	ParameterString,
	baseGenericConstraints,
	parseValidGenericParams,
	validateParameterString
} from "./generic.ts"
import type { Ark, keywords, type } from "./keywords/keywords.ts"
import type { MatchParser } from "./match.ts"
import type { BaseType } from "./methods/base.ts"
import type { instantiateType } from "./methods/instantiate.ts"
import type { validateDeclared } from "./parser/definition.ts"
import type {
	ArgTwoOperator,
	IndexZeroOperator,
	TupleInfixOperator
} from "./parser/tupleExpressions.ts"
import type {
	InternalScope,
	ModuleParser,
	Scope,
	ScopeParser,
	bindThis
} from "./scope.ts"

/** The convenience properties attached to `type` */
export type TypeParserAttachments =
	// map over to remove call signatures
	Omit<TypeParser, never>

export interface TypeParser<$ = {}> extends Ark.boundTypeAttachments<$> {
	/**
	 * Create a {@link Type} from your definition.
	 *
	 * @example const person = type({ name: "string" })
	 */
	<const def, r = type.instantiate<def, $>>(
		// Parse and check the definition, returning either the original input for a
		// valid definition or a string representing an error message.
		def: type.validate<def, $>
	): r extends infer _ ? _ : never

	/**
	 * Create a {@link Generic} from a parameter string and body definition.
	 *
	 * @param params A string like "<t, n extends number>" specifying the
	 * {@link Generic}'s parameters and any associated constraints via `extends`.
	 *
	 * @param def The definition for the body of the {@link Generic}. Can reference the
	 * parameter names specified in the previous argument in addition to aliases
	 * from its {@link Scope}.
	 *
	 * @example const boxOf = type("<t extends string | number>", { contents: "t" })
	 */
	<
		const params extends ParameterString,
		const def,
		r = Generic<parseValidGenericParams<params, $>, def, $>
	>(
		params: validateParameterString<params, $>,
		def: type.validate<
			def,
			$,
			baseGenericConstraints<parseValidGenericParams<params, $>>
		>
	): r extends infer _ ? _ : never

	/**
	 * Create a {@link Type} from a [tuple expression](http://localhost:3000/docs/expressions)
	 * spread as this function's arguments.
	 *
	 * @example type("string", "|", { foo: "number" })
	 */
	<
		const zero,
		const one,
		const rest extends array,
		r = type.instantiate<[zero, one, ...rest], $>
	>(
		_0: zero extends IndexZeroOperator ? zero : type.validate<zero, $>,
		_1: zero extends "keyof" ? type.validate<one, $>
		: zero extends "instanceof" ? conform<one, Constructor>
		: zero extends "===" ? conform<one, unknown>
		: conform<one, ArgTwoOperator>,
		..._2: zero extends "===" ? rest
		: zero extends "instanceof" ? conform<rest, readonly Constructor[]>
		: one extends TupleInfixOperator ?
			one extends ":" ? [Predicate<distill.In<type.infer<zero, $>>>]
			: one extends "=>" ? [Morph<distill.Out<type.infer<zero, $>>, unknown>]
			: one extends "|>" ? [type.validate<rest[0], $>]
			: one extends "@" ? [TypeMeta.MappableInput]
			: [type.validate<rest[0], $>]
		:	[]
	): r extends infer _ ? _ : never

	/**
	 * An alias of the {@link ArkErrors} class, an instance of which is returned when a {@link Type}
	 * is invoked with invalid input.
	 *
	 * @example
	 * const out = myType(data)
	 *
	 * if(out instanceof type.errors) console.log(out.summary)
	 *
	 */
	errors: typeof ArkErrors
	hkt: typeof Hkt
	keywords: typeof keywords
	/**
	 * The {@link Scope} in which definitions passed to this function will be parsed.
	 */
	$: Scope<$>
	/**
	 * An alias of `type` with no type-level validation or inference.
	 *
	 * Useful when wrapping `type` or using it to parse a dynamic definition.
	 */
	raw(def: unknown): BaseType<any, $>
	module: ModuleParser
	scope: ScopeParser
	define: DefinitionParser<$>
	generic: GenericParser<$>
	match: MatchParser<$>
	schema: SchemaParser<$>
	/**
	 * Create a {@link Type} that is satisfied only by a value strictly equal (`===`) to the argument passed to this function.
	 * @example const foo = type.unit('foo') // {@link Type}<'foo'>
	 * @example const sym: unique symbol = Symbol(); type.unit(sym) // {@link Type}<typeof sym>
	 */
	unit: UnitTypeParser<$>
	/**
	 * Create a {@link Type} that is satisfied only by a value strictly equal (`===`) to one of the arguments passed to this function.
	 * @example const enum = type.enumerated('foo', 'bar', obj) // obj is a by-reference object
	 * @example const tupleForm = type(['===', 'foo', 'bar', obj])
	 * @example const argsForm = type('===', 'foo', 'bar', obj)
	 */
	enumerated: EnumeratedTypeParser<$>
	/**
	 * Create a {@link Type} that is satisfied only by one of the Object.values() of the argument passed to this function.
	 *
	 * ⚠️ For TypeScript enum compatibility, values at numeric keys with corresponding numeric values will not be included.
	 * @example const myEnum = type.valueOf(myTsEnum)
	 */
	valueOf: ValueOfTypeParser<$>
	/**
	 * Create a {@link Type} that is satisfied only by a value of a specific class.
	 * @example const array = type.instanceOf(Array)
	 */
	instanceOf: InstanceOfTypeParser<$>
}

export class InternalTypeParser extends Callable<
	(...args: unknown[]) => BaseRoot | Generic,
	TypeParserAttachments
> {
	constructor($: InternalScope) {
		const attach: TypeParserAttachments = Object.assign(
			{
				errors: ArkErrors,
				hkt: Hkt,
				$: $ as never,
				raw: $.parse as never,
				module: $.constructor.module,
				scope: $.constructor.scope,
				define: $.define as never,
				match: $.match as never,
				generic: $.generic as never,
				schema: $.schema as never,
				// this won't be defined during bootstrapping, but externally always will be
				keywords: $.ambient as never,
				unit: $.unit,
				enumerated: $.enumerated,
				instanceOf: $.instanceOf,
				valueOf: $.valueOf
			} satisfies Omit<TypeParserAttachments, keyof Ark.typeAttachments>,
			// also won't be defined during bootstrapping
			$.ambientAttachments!
		)
		super(
			(...args) => {
				if (args.length === 1) {
					// treat as a simple definition
					return $.parse(args[0])
				}
				if (
					args.length === 2 &&
					typeof args[0] === "string" &&
					args[0][0] === "<" &&
					args[0].at(-1) === ">"
				) {
					// if there are exactly two args, the first of which looks like <${string}>,
					// treat as a generic
					const paramString = args[0].slice(1, -1)
					const params = $.parseGenericParams(paramString, {})

					return new GenericRoot(
						params,
						args[1],
						$ as never,
						$ as never,
						null
					) as never
				}
				// otherwise, treat as a tuple expression. technically, this also allows
				// non-expression tuple definitions to be parsed, but it's not a supported
				// part of the API as specified by the associated types
				return $.parse(args)
			},
			{
				bind: $,
				attach
			}
		)
	}
}

export type DeclarationParser<$> = <preinferred>() => {
	// for some reason, making this a const parameter breaks preinferred validation
	type: <const def>(
		def: validateDeclared<preinferred, def, $, bindThis<def>>
	) => Type<preinferred, $>
}

export type UnitTypeParser<$> = <const t>(value: t) => Type<t, $>

export type InstanceOfTypeParser<$> = <const t extends object>(
	ctor: Constructor<t>
) => Type<t, $>

export type EnumeratedTypeParser<$> = <const values extends readonly unknown[]>(
	...values: values
) => Type<values[number], $>

export type ValueOfTypeParser<$> = <const o extends object>(
	o: o
) => Type<o[keyof o], $>

export type DefinitionParser<$> = <const def>(def: type.validate<def, $>) => def

export type SchemaParser<$> = (
	schema: RootSchema,
	opts?: BaseParseOptions
) => Type<unknown, $>

export type Type<t = unknown, $ = {}> = instantiateType<t, $>

export type TypeConstructor<t = unknown, $ = {}> = new (
	def: unknown,
	$: Scope<$>
) => Type<t, $>

export const Type: TypeConstructor = BaseRoot as never

export type UnionTypeParser<$> = {
	(): Type<never, $>
	<const a, r = Type<type.infer<a>, $>>(
		a: type.validate<a, $>
	): r extends infer _ ? _ : never
	<const a, const b, r = Type<type.infer<a> | type.infer<b>, $>>(
		a: type.validate<a, $>,
		b: type.validate<b, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		r = Type<type.infer<a> | type.infer<b> | type.infer<c>, $>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		r = Type<type.infer<a> | type.infer<b> | type.infer<c> | type.infer<d>, $>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>
			| type.infer<k>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>
			| type.infer<k>
			| type.infer<l>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>
			| type.infer<k>
			| type.infer<l>
			| type.infer<m>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>
			| type.infer<k>
			| type.infer<l>
			| type.infer<m>
			| type.infer<n>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>
			| type.infer<k>
			| type.infer<l>
			| type.infer<m>
			| type.infer<n>
			| type.infer<o>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>
			| type.infer<k>
			| type.infer<l>
			| type.infer<m>
			| type.infer<n>
			| type.infer<o>
			| type.infer<p>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		const q,
		r = Type<
			| type.infer<a>
			| type.infer<b>
			| type.infer<c>
			| type.infer<d>
			| type.infer<e>
			| type.infer<f>
			| type.infer<g>
			| type.infer<h>
			| type.infer<i>
			| type.infer<j>
			| type.infer<k>
			| type.infer<l>
			| type.infer<m>
			| type.infer<n>
			| type.infer<o>
			| type.infer<p>
			| type.infer<q>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>,
		q: type.validate<q, $>
	): r extends infer _ ? _ : never
}

// export type IntersectionTypeParser<$> = {
// 	(): Type<never, $>
// 	<const a, r = Type<type.infer<a>, $>>(
// 		a: type.validate<a, $>
// 	): r extends infer _ ? _ : never
// 	<
// 		const a,
// 		const b,
// 		r = Type<inferIntersection<type.infer<a>, type.infer<b>>, $>
// 	>(
// 		a: type.validate<a, $>,
// 		b: type.validate<b, $>
// 	): r extends infer _ ? _ : never
// 	<
// 		const a,
// 		const b,
// 		const c,
// 		r = Type<inferIntersection<type.infer<a>, type.infer<b>>, $>
// 	>(
// 		a: type.validate<a, $>,
// 		b: type.validate<b, $>
// 	): r extends infer _ ? _ : never
// }
