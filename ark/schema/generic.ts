import { Callable, flatMorph, type conform, type repeat } from "@arktype/util"
import type { SchemaDef, SchemaNode } from "./base.js"
import { keywordNodes } from "./keywords/keywords.js"
import type { instantiateSchema } from "./parser/inference.js"
import type { BaseScope } from "./scope.js"
import { arkKind, type inferred } from "./shared/utils.js"

export type GenericNodeInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<args, repeat<[SchemaDef], params["length"]>>
) => instantiateSchema<def, $ & bindGenericNodeInstantiation<params, $, args>>

type bindGenericNodeInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: instantiateSchema<
		args[i & keyof args],
		$
	>[inferred]
}

export const validateUninstantiatedGenericNode = (
	g: GenericNode
): GenericNode => {
	g.$.schema(g.def as never, {
		args: flatMorph(g.params, (_, name) => [name, keywordNodes.unknown])
	})
	return g
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
			]) as Record<string, SchemaNode>
			return $.schema(def as never, { args: argNodes }) as never
		})
	}
}
