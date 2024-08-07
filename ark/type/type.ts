import {
	ArkErrors,
	BaseRoot,
	GenericRoot,
	type MetaSchema,
	type Morph,
	type Predicate
} from "@ark/schema"
import { Callable, type Constructor, type array, type conform } from "@ark/util"
import type { distillIn, distillOut } from "./ast.js"
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
import type { BaseType } from "./subtypes/base.js"
import type { instantiateType } from "./subtypes/instantiate.js"

/** The convenience properties attached to `type` */
export type TypeParserAttachments =
	// map over to remove call signatures
	Omit<TypeParser, never>

export interface TypeParser<$ = {}> {
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def, r = Type<inferTypeRoot<def, $>, $>>(
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
		r = Type<inferTypeRoot<[zero, one, ...rest], $>, $>
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
			: one extends "@" ? [MetaSchema]
			: [validateTypeRoot<rest[0], $>]
		:	[]
	): r

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
	type: <const def>(
		def: validateDeclared<preinferred, def, $, bindThis<def>>
	) => Type<preinferred, $>
}

export type DefinitionParser<$> = <def>(def: validateTypeRoot<def, $>) => def

export type validateTypeRoot<def, $ = {}> = validateDefinition<
	def,
	$,
	bindThis<def>
>

export type inferTypeRoot<def, $> = inferDefinition<def, $, bindThis<def>>

export type validateAmbient<def> = validateTypeRoot<def, {}>

export type inferAmbient<def> = inferTypeRoot<def, {}>

export type Type<t = unknown, $ = {}> = instantiateType<t, $>

export declare namespace Type {
	export type Any<t = any> = BaseType<t, any>
}

export type TypeConstructor<t = unknown, $ = {}> = new (
	def: unknown,
	$: Scope<$>
) => Type<t, $>

export const Type: TypeConstructor = BaseRoot as never
