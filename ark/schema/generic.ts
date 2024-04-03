import { Callable, flatMorph, type conform, type repeat } from "@arktype/util"
import type { TypeSchema } from "./base.js"
import type { instantiateSchema } from "./parser/inference.js"
import type { BaseScope } from "./scope.js"
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

// Comparing to Generic directly doesn't work well, so we compare to only its props
export type GenericProps<
	params extends string[] = string[],
	def = unknown,
	$ = any,
	scope extends BaseScope = BaseScope
> = {
	[arkKind]: "generic"
	$: $
	parameters: params
	def: def
	scope: scope
}

export class GenericNode<
		params extends string[] = string[],
		def = unknown,
		$ = any
	>
	extends Callable<GenericNodeInstantiation<params, def, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"
	declare readonly $: $

	constructor(
		public parameters: params,
		public def: def,
		public scope: BaseScope<$>
	) {
		super((...args: TypeSchema[]) => {
			const argNodes = flatMorph(parameters, (i, param) => [
				param,
				scope.root(args[i])
			])
			return scope.root(def as never, { args: argNodes }) as never
		})
	}
}
