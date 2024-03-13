import { morph, type Constructor, type List, type conform } from "@arktype/util"
import { keywords } from "./builtins/ark.js"
import type { Predicate } from "./constraints/predicate.js"
import type {
	inferDefinition,
	validateDeclared,
	validateDefinition
} from "./parser/definition.js"
import {
	parseGenericParams,
	type GenericParamsParseError
} from "./parser/generic.js"
import type {
	IndexOneOperator,
	IndexZeroOperator,
	TupleInfixOperator
} from "./parser/tuple.js"
import type { Scope, bindThis } from "./scope.js"
import type { BaseMeta } from "./shared/declare.js"
import type { Morph, extractIn, extractOut } from "./types/morph.js"
import type { Type } from "./types/type.js"
import { arkKind } from "./util.js"

export type TypeParser<$> = {
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def>(def: validateTypeRoot<def, $>): Type<inferTypeRoot<def, $>, $>

	// Spread version of a tuple expression
	<const zero, const one, const rest extends List>(
		_0: zero extends IndexZeroOperator ? zero : validateTypeRoot<zero, $>,
		_1: zero extends "keyof"
			? validateTypeRoot<one, $>
			: zero extends "instanceof"
			? conform<one, Constructor>
			: zero extends "==="
			? conform<one, unknown>
			: conform<one, IndexOneOperator>,
		..._2: zero extends "==="
			? rest
			: zero extends "instanceof"
			? conform<rest, readonly Constructor[]>
			: one extends TupleInfixOperator
			? one extends ":"
				? [Predicate<extractIn<inferTypeRoot<zero, $>>>]
				: one extends "=>"
				? // TODO: centralize
				  [Morph<extractOut<inferTypeRoot<zero, $>>, unknown>]
				: one extends "@"
				? [string | BaseMeta]
				: [validateTypeRoot<rest[0], $>]
			: []
	): Type<inferTypeRoot<[zero, one, ...rest], $>, $>

	<params extends string, const def>(
		params: `<${validateParameterString<params>}>`,
		def: validateDefinition<
			def,
			$,
			{
				[param in parseGenericParams<params>[number]]: unknown
			}
		>
	): Generic<parseGenericParams<params>, def, $>
}

export type DeclarationParser<$> = <preinferred>() => {
	// for some reason, making this a const parameter breaks preinferred validation
	type: <def>(
		def: validateDeclared<preinferred, def, $, bindThis<def>>
	) => Type<preinferred, $>
}

export const createTypeParser = <$>(scope: Scope): TypeParser<$> => {
	const parser = (...args: unknown[]): Type | Generic => {
		if (args.length === 1) {
			// treat as a simple definition
			return parseTypeRoot(args[0], scope)
		}
		if (
			args.length === 2 &&
			typeof args[0] === "string" &&
			args[0][0] === "<" &&
			args[0].at(-1) === ">"
		) {
			// if there are exactly two args, the first of which looks like <${string}>,
			// treat as a generic
			const params = parseGenericParams(args[0].slice(1, -1))
			const def = args[1]
			return validateUninstantiatedGeneric(generic(params, def, scope) as never)
		}
		// otherwise, treat as a tuple expression. technically, this also allows
		// non-expression tuple definitions to be parsed, but it's not a supported
		// part of the API as specified by the associated types
		return parseTypeRoot(args, scope)
	}
	return parser as never
}

export type DefinitionParser<$> = <def>(
	def: validateDefinition<def, $, bindThis<def>>
) => def

const parseTypeRoot = (def: unknown, scope: Scope, args?: BoundArgs) =>
	scope.parseDefinition(def, {
		args: args ?? scope.bindThis(),
		baseName: "type"
	})

export type validateTypeRoot<def, $> = validateDefinition<def, $, bindThis<def>>

export type inferTypeRoot<def, $> = inferDefinition<def, $, bindThis<def>>

type validateParameterString<params extends string> =
	parseGenericParams<params> extends GenericParamsParseError<infer message>
		? message
		: params

export const validateUninstantiatedGeneric = (g: Generic): Generic => {
	// the unconstrained instantiation of the generic is not used for now
	// other than to eagerly validate that the def does not contain any errors
	g.scope.parseDefinition(
		g.definition,
		// once we support constraints on generic parameters, we'd use
		// the base type here: https://github.com/arktypeio/arktype/issues/796
		{
			baseName: "generic",
			args: morph(g.parameters, (_, name) => [name, keywords.unknown])
		}
	)
	return g
}

export const generic = (
	parameters: string[],
	definition: unknown,
	scope: Scope
): Generic =>
	Object.assign(
		(...args: unknown[]) => {
			const argNodes = morph(parameters, (i, param) => [
				param,
				parseTypeRoot(args[i], scope)
			])
			return parseTypeRoot(definition, scope, argNodes)
		},
		{
			[arkKind]: "generic",
			parameters,
			definition,
			scope
			// $ is only needed at compile-time
		} satisfies Omit<GenericProps, "$">
	) as never

// Comparing to Generic directly doesn't work well, so we compare to only its props
export type GenericProps<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = {
	[arkKind]: "generic"
	$: $
	parameters: params
	definition: def
	scope: Scope
}

export type BoundArgs = Record<string, Type>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
export type Generic<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = {
	<args>(
		...args: conform<
			args,
			{
				[i in keyof params]: validateTypeRoot<args[i & keyof args], $>
			}
		>
	): Type<inferDefinition<def, $, bindGenericInstantiation<params, $, args>>, $>
} & GenericProps<params, def, $>

type bindGenericInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}
