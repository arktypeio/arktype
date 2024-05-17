import { Callable, type conform, type repeat } from "@arktype/util"
import type { inferRoot } from "./inference.js"
import type { RootSchema } from "./kinds.js"
import type { Root } from "./roots/root.js"
import type { RootScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericNodeInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<args, repeat<[RootSchema], params["length"]>>
) => Root<inferRoot<def, $ & bindGenericNodeInstantiation<params, $, args>>>

// TODO: ????
export type bindGenericNodeInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferRoot<
		args[i & keyof args],
		$
	>
}

export const validateUninstantiatedGenericNode = (
	g: GenericRoot
): GenericRoot => {
	g.$.schema(g.def as never, {
		// // TODO: probably don't need raw once this is fixed.
		// args: flatMorph(g.params, (_, name) => [name, g.$.raw.keywords.unknown])
	})
	return g
}

// Comparing to Generic directly doesn't work well, so we compare to only its props
export interface GenericProps<
	params extends string[] = string[],
	def = any,
	$ = any
> {
	[arkKind]: "generic"
	params: params
	def: def
	$: RootScope<$>
}

export class GenericRoot<params extends string[] = string[], def = any, $ = any>
	extends Callable<GenericNodeInstantiation<params, def, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"

	constructor(
		public params: params,
		public def: def,
		public $: RootScope<$>
	) {
		super((...args: RootSchema[]) => {
			args
			// const argNodes: Record<string, RawRoot> = flatMorph(
			// 	params,
			// 	(i, param) => [param, $.schema(args[i])]
			// ) as never
			// { args: argNodes }
			return $.schema(def as never) as never
		})
	}
}
