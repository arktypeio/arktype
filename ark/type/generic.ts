import type {
	GenericNodeSignature,
	GenericParamAst,
	GenericRoot
} from "@arktype/schema"
import type { array, Callable, conform } from "@arktype/util"
import type { inferDefinition } from "./parser/definition.js"
import type {
	GenericParamsParseError,
	parseGenericParams
} from "./parser/generic.js"
import type { inferTypeRoot, Type, validateTypeRoot } from "./type.js"

export type validateParameterString<params extends string> =
	parseGenericParams<params> extends GenericParamsParseError<infer message> ?
		message
	:	params

export type GenericTypeInstantiation<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	def = any,
	$ = any
> = <args>(
	...args: conform<
		args,
		{
			[i in keyof params]: validateTypeRoot<args[i & keyof args], $>
		}
	>
) => Type<inferDefinition<def, $, bindGenericInstantiation<params, $, args>>, $>

export type GenericInstantiation<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	def = any,
	$ = any
> = GenericTypeInstantiation<params, def, $> &
	GenericNodeSignature<params, def, $>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
type bindGenericInstantiation<
	params extends array<GenericParamAst>,
	$,
	args
> = {
	[i in keyof params & `${number}` as params[i][0]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}

// TODO: should be Scope<$>, but breaks inference
export interface Generic<
	params extends array<GenericParamAst> = array<GenericParamAst>,
	bodyDef = unknown,
	$ = any
> extends Callable<GenericInstantiation<params, bodyDef, $>>,
		GenericRoot<params, bodyDef, $> {}
