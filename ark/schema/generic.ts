import { Callable, type conform, type repeat } from "@arktype/util"
import type { TypeSchema } from "./base.js"
import type { instantiateSchema } from "./parser/inference.js"
import { arkKind, type inferred } from "./shared/utils.js"

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
export type GenericNodeInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<args, repeat<[TypeSchema], params["length"]>>
) => instantiateSchema<def, $ & bindGenericInstantiation<params, $, args>>

type bindGenericInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: instantiateSchema<
		args[i & keyof args],
		$
	>[inferred]
}

export class GenericNode<
	params extends string[] = string[],
	def = unknown,
	$ = any
> extends Callable<GenericNodeInstantiation<params, def, $>> {
	readonly [arkKind] = "generic"
	readonly $: $
	readonly parameters: params
	readonly definition: def
	readonly scope: Scope
}
