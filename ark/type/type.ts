import {
	ArkErrors,
	BaseRoot,
	finalizeExport,
	GenericRoot,
	type BaseParseOptions,
	type Morph,
	type NodeSelector,
	type RootSchema,
	type TypeMeta
} from "@ark/schema"
import {
	Callable,
	defineLazily,
	Hkt,
	type Constructor,
	type array,
	type conform
} from "@ark/util"
import type { distill } from "./attributes.ts"
import { deferDefinition, deferUnion, deferUnits } from "./deferred.ts"
import type { DeclarationParser } from "./declare.ts"
import type { FnParser } from "./fn.ts"
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
import type {
	NaryIntersectionParser,
	NaryMergeParser,
	NaryPipeParser,
	NaryUnionParser
} from "./nary.ts"
import type { validateDefinition } from "./parser/definition.ts"
import type {
	ArgTwoOperator,
	IndexZeroOperator,
	TupleInfixOperator,
	validatePredicate
} from "./parser/tupleExpressions.ts"
import {
	$arkTypeRegistry,
	type bindThis,
	type InternalScope,
	type ModuleParser,
	type Scope,
	type ScopeParser
} from "./scope.ts"
import type { BaseType } from "./variants/base.ts"
import type { instantiateType } from "./variants/instantiate.ts"

/**
 * What the arguments of `type`'s second signature are checked against, wherever
 * that has to be computed from them.
 *
 * It's an interface with annotated variance for the reason
 * `validateDefinitionArgument` goes through one: completing a string
 * argument has TypeScript infer from each parameter's type to itself, and an
 * alias met there with a type parameter among its arguments has its variance
 * measured. `validateParameterString`, `parseValidGenericParams` and
 * `type.infer` each reach the whole string parser that way, at 450-670ms a
 * completion on TypeScript 6. Indexed by a key that's deferred until `zero` is
 * known, nothing in here is visited.
 *
 * The rest parameter's tuples are properties too, rather than written around
 * an indexed property in the signature. The first call of that form then costs
 * fewer instantiations than it did without any of this (about 2,500 against
 * 3,000 for `type("string", "|>", "unknown")`, and against 13,500 with a morph),
 * where a tuple in the signature costs more (3,600). Each later call costs 20 to
 * 95 more, the price of the interface. Their elements are indexed again because
 * TypeScript also infers to a tuple's element type from the string being
 * completed.
 */
export interface ValidatedArgs<
	in out zero,
	in out one,
	in out rest extends array,
	in out $
> {
	params: zero extends ParameterString ? validateParameterString<zero, $>
	:	never
	body: zero extends ParameterString ?
		validateDefinition<
			one,
			$,
			baseGenericConstraints<parseValidGenericParams<zero, $>>
		>
	:	never
	predicate: validatePredicate<
		type.infer<zero, $>,
		distill.In<type.infer<zero, $>>
	>
	morph: Morph<distill.Out<type.infer<zero, $>>, unknown>
	operand: validateDefinition<rest[0], $, bindThis<rest[0]>>
	predicateRest: [
		ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "predicate"
		:	never]
	]
	morphRest: [
		ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "morph" : never]
	]
	operandRest: [
		ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "operand" : never]
	]
}

/** The convenience properties attached to `type` */
export type TypeParserAttachments =
	// map over to remove call signatures
	Omit<TypeParser, never>

export interface TypeParser<$ = {}> extends Ark.boundTypeAttachments<$> {
	/**
	 * Create a {@link Type} from your definition.
	 *
	 * @example const Person = type({ name: "string" })
	 */
	<const def, r = type.instantiate<def, $>>(
		// Parse and check the definition, returning either the original input for a
		// valid definition or a string representing an error message.
		def: type.validate<def, $>
	): r extends infer _ ? _ : never

	/**
	 * Create a {@link Generic} from a parameter string and body definition, or a
	 * {@link Type} from a [tuple expression](https://arktype.io/docs/expressions)
	 * spread as this function's arguments.
	 *
	 * @param params A string like "<t, n extends number>" specifying the
	 * {@link Generic}'s parameters and any associated constraints via `extends`.
	 *
	 * @param def The definition for the body of the {@link Generic}. Can reference the
	 * parameter names specified in the previous argument in addition to aliases
	 * from its {@link Scope}.
	 *
	 * @example const BoxOf = type("<t extends string | number>", { contents: "t" })
	 * @example type("string", "|", { foo: "number" })
	 */
	// a single signature so TS 7, which only reports the last overload's error,
	// shows the same errors as TS 6 for both forms
	<
		const zero,
		const one,
		const rest extends array,
		r = zero extends ParameterString ?
			Generic<parseValidGenericParams<zero, $>, one, $>
		:	type.instantiate<[zero, one, ...rest], $>
	>(
		_0: zero extends ParameterString ?
			ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "params" : never]
		: zero extends IndexZeroOperator ? zero
		: type.validate<zero, $>,
		_1: zero extends ParameterString ?
			ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "body" : never]
		: zero extends "keyof" ? type.validate<one, $>
		: zero extends "instanceof" ? conform<one, Constructor>
		: zero extends "===" ? conform<one, unknown>
		: conform<one, ArgTwoOperator>,
		..._2: zero extends ParameterString ? []
		: zero extends "===" ? rest
		: zero extends "instanceof" ? conform<rest, readonly Constructor[]>
		: one extends TupleInfixOperator ?
			one extends ":" ?
				ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "predicateRest"
				:	never]
			: one extends "=>" ?
				ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "morphRest"
				:	never]
			: one extends "@" ? [TypeMeta.MappableInput, NodeSelector?]
			: ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "operandRest"
				:	never]
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
	declare: DeclarationParser<$>
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
	 * @example const TupleForm = type(['===', 'foo', 'bar', obj])
	 * @example const ArgsForm = type('===', 'foo', 'bar', obj)
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
	/**
	 * Create a {@link Type} from a union of definitions
	 * @example const T = type.or("string", "number")
	 */
	or: NaryUnionParser<$>
	/**
	 * Create a {@link Type} from an intersection of definitions
	 * @example const T = type.and({ a: "1" }, { b: "2" })
	 */
	and: NaryIntersectionParser<$>
	/**
	 * Create a {@link Type} by merging object definitions, with later
	 * definitions having precedence for overlapping keys
	 * @example
	 * // Type<{ a: "3", b: "2", c: "4" }>
	 * const T = type.merge({ a: "1", b: "2" }, { a: "3", c: "4" })
	 */
	merge: NaryMergeParser<$>
	/**
	 * Create a {@link Type} from a set of morphs (including Types)
	 * @example
	 * // Type<(In: string) => To<object>>
	 * const T = type.pipe(type.string, s => JSON.parse(s), type.object)
	 */
	pipe: NaryPipeParser<$>
	/**
	 * Define a validated function
	 * @example
	 * const len = type.fn("string | unknown[]", ":", "number")(s => s.length)
	 * len("foo") // 3
	 * // TypeScript: boolean is not assignable to string | unknown[]
	 * // Runtime (throws): [0] must be a string or an array
	 * len(true)
	 */
	fn: FnParser<$>
}

export class InternalTypeParser extends Callable<
	(...args: unknown[]) => BaseRoot | Generic,
	TypeParserAttachments
> {
	constructor($: InternalScope) {
		const attach = {
			errors: ArkErrors,
			hkt: Hkt,
			$: $ as never,
			raw: $.parse as never,
			module: $.constructor.module,
			scope: $.constructor.scope,
			declare: $.declare as never,
			define: $.define as never,
			match: $.match as never,
			generic: $.generic as never,
			schema: $.schema as never,
			// this won't be defined during bootstrapping, but externally always will be
			keywords: $.ambient as never,
			unit: ((value: unknown) =>
				deferUnits([value], $) ?? $.unit(value)) as never,
			enumerated: ((...values: unknown[]) =>
				deferUnits(values, $) ?? $.enumerated(...values)) as never,
			instanceOf: $.instanceOf,
			valueOf: $.valueOf,
			or: ((...branches: unknown[]) =>
				deferUnion(branches, $) ?? ($.or as any)(...branches)) as never,
			and: $.and,
			merge: $.merge,
			pipe: $.pipe,
			fn: $.fn as never
		} satisfies Omit<TypeParserAttachments, keyof Ark.typeAttachments>
		super(
			(...args) => {
				if (args.length === 1) {
					// treat as a simple definition
					return deferDefinition(args[0], $) ?? $.parse(args[0])
				}
				if (
					args.length === 2 &&
					typeof args[0] === "string" &&
					args[0][0] === "<" &&
					args[0][args[0].length - 1] === ">"
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
			{ attach: attach as never }
		)
		// also won't be defined during bootstrapping
		const typeAttachments = $arkTypeRegistry.typeAttachments
		const resolve = (k: string) => {
			const bound = $.bindKw(
				typeAttachments![k as never] as BaseRoot | GenericRoot
			)
			// a resolved scope has already compiled the nodes bound before it
			return $.resolved ? finalizeExport($, bound) : bound
		}
		for (const k in typeAttachments) defineLazily(this, k, resolve)
	}
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
