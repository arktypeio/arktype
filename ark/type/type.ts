import {
	ArkErrors,
	BaseRoot,
	GenericRoot,
	type BaseParseOptions,
	type MetaSchema,
	type Morph,
	type Predicate,
	type RootSchema
} from "@ark/schema"
import {
	Callable,
	Hkt,
	type Constructor,
	type array,
	type conform
} from "@ark/util"
import type { distill } from "./attributes.ts"
import type {
	Generic,
	GenericParser,
	ParameterString,
	baseGenericConstraints,
	parseValidGenericParams,
	validateParameterString
} from "./generic.ts"
import type { Ark, keywords, type } from "./keywords/keywords.ts"
import type { BaseType } from "./methods/base.ts"
import type { instantiateType } from "./methods/instantiate.ts"
import type { validateDeclared } from "./parser/definition.ts"
import type {
	IndexOneOperator,
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
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def, r = Type<type.infer<def, $>, $>>(def: type.validate<def, $>): r

	<const params extends ParameterString, const def>(
		params: validateParameterString<params, $>,
		def: type.validate<
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
		r = Type<type.infer<[zero, one, ...rest], $>, $>
	>(
		_0: zero extends IndexZeroOperator ? zero : type.validate<zero, $>,
		_1: zero extends "keyof" ? type.validate<one, $>
		: zero extends "instanceof" ? conform<one, Constructor>
		: zero extends "===" ? conform<one, unknown>
		: conform<one, IndexOneOperator>,
		..._2: zero extends "===" ? rest
		: zero extends "instanceof" ? conform<rest, readonly Constructor[]>
		: one extends TupleInfixOperator ?
			one extends ":" ? [Predicate<distill.In<type.infer<zero, $>>>]
			: one extends "=>" ? [Morph<distill.Out<type.infer<zero, $>>, unknown>]
			: one extends "@" ? [MetaSchema]
			: [type.validate<rest[0], $>]
		:	[]
	): r

	/**
	 * Error class for validation errors
	 * Calling type instance returns an instance of this class on failure
	 * @example if ( T(data) instanceof type.errors ) { ... }
	 */
	errors: typeof ArkErrors
	hkt: typeof Hkt
	keywords: typeof keywords
	$: Scope<$>
	raw(def: unknown): BaseType<any, $>
	module: ModuleParser
	scope: ScopeParser
	define: DefinitionParser<$>
	generic: GenericParser<$>
	schema: SchemaParser<$>
	/**
	 * Create a `Type` that is satisfied only by a value strictly equal (`===`) to the argument passed to this function.
	 * @example const foo = type.unit('foo') // Type<'foo'>
	 * @example const sym: unique symbol = Symbol(); type.unit(sym) // Type<typeof sym>
	 */
	unit: UnitTypeParser<$>
	/**
	 * Create a `Type` that is satisfied only by a value strictly equal (`===`) to one of the arguments passed to this function.
	 * @example const enum = type.enumerated('foo', 'bar', obj) // obj is a by-reference object
	 * @example const tupleForm = type(['===', 'foo', 'bar', obj])
	 * @example const argsForm = type('===', 'foo', 'bar', obj)
	 */
	enumerated: EnumeratedTypeParser<$>
	/**
	 * Create a `Type` that is satisfied only by a value of a specific class.
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
				generic: $.generic as never,
				schema: $.schema as never,
				// this won't be defined during bootstrapping, but externally always will be
				keywords: $.ambient as never,
				unit: $.unit,
				enumerated: $.enumerated,
				instanceOf: $.instanceOf
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
						$ as never
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
