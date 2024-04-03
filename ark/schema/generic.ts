import { Callable, flatMorph, type conform, type repeat } from "@arktype/util"
import type { SchemaDef } from "./base.js"
import type { instantiateSchema } from "./parser/inference.js"
import type { BaseScope } from "./scope.js"
import { arkKind, type inferred } from "./shared/utils.js"

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
export type GenericNodeInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<args, repeat<[SchemaDef], params["length"]>>
) => instantiateSchema<def, $ & bindGenericInstantiation<params, $, args>>

type bindGenericInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: instantiateSchema<
		args[i & keyof args],
		$
	>[inferred]
}

// Comparing to Generic directly doesn't work well, so we compare to only its props
export interface GenericProps<
	params extends string[] = string[],
	def = unknown,
	$ = any
> {
	[arkKind]: "generic"
	params: params
	def: def
	$: BaseScope<$>
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

	constructor(
		public params: params,
		public def: def,
		public $: BaseScope<$>
	) {
		super((...args: SchemaDef[]) => {
			const argNodes = flatMorph(params, (i, param) => [
				param,
				$.schema(args[i])
			])
			return $.schema(def as never, { args: argNodes }) as never
		})
	}
}
