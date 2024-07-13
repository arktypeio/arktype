import type {
	GenericNodeSignature,
	GenericParam,
	GenericRoot,
	namesOf
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
	params extends array<GenericParam> = array<GenericParam>,
	def = any,
	$ = any
> = <args>(
	...args: conform<
		args,
		{
			[i in keyof params]: validateTypeRoot<args[i & keyof args], $>
		}
	>
) => Type<
	inferDefinition<def, $, bindGenericInstantiation<namesOf<params>, $, args>>,
	$
>

export type GenericInstantiation<
	params extends array<GenericParam> = array<GenericParam>,
	def = any,
	$ = any
> = GenericTypeInstantiation<params, def, $> &
	GenericNodeSignature<params, def, $>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
type bindGenericInstantiation<params extends array<string>, $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}

// TODO: should be Scope<$>, but breaks inference
export interface Generic<
	params extends array<GenericParam> = array<GenericParam>,
	def = unknown,
	$ = any
> extends Callable<GenericInstantiation<params, def, $>>,
		GenericRoot<params, def, $> {}
