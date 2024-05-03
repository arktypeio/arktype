import {
	type GenericNodeInstantiation,
	type GenericProps,
	type RootScope,
	arkKind
} from "@arktype/schema"
import { Callable, type conform } from "@arktype/util"
import type { inferDefinition } from "./parser/definition.js"
import type {
	GenericParamsParseError,
	parseGenericParams
} from "./parser/generic.js"
import type { Type, inferTypeRoot, validateTypeRoot } from "./type.js"
export type validateParameterString<params extends string> =
	parseGenericParams<params> extends GenericParamsParseError<infer message> ?
		message
	:	params

export type GenericTypeInstantiation<
	params extends string[] = string[],
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
	params extends string[] = string[],
	def = any,
	$ = any
> = GenericTypeInstantiation<params, def, $> &
	GenericNodeInstantiation<params, def, $>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
type bindGenericInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}

export class Generic<params extends string[] = string[], def = unknown, $ = any>
	extends Callable<GenericInstantiation<params, def, $>>
	implements GenericProps<params, def, $>
{
	readonly [arkKind] = "generic"

	constructor(
		public params: params,
		public def: def,
		// TODO: should be Scope<$>, but breaks inference
		public $: RootScope<$>
	) {
		super((...args: unknown[]) => {
			// const argNodes = flatMorph(params, (i, param: string) => [
			// 	param,
			// 	$.parseRoot(args[i])
			// ])
			// { args: argNodes }
			args
			return $.parseRoot(def) as never
		})
	}
}
