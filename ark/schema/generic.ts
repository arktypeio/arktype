import { Callable, type conform, type repeat } from "@arktype/util"
import type { inferSchema } from "./inference.js"
import type { SchemaDef } from "./kinds.js"
import type { Schema } from "./schema.js"
import type { SchemaScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericNodeInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<args, repeat<[SchemaDef], params["length"]>>
) => Schema<inferSchema<def, $ & bindGenericNodeInstantiation<params, $, args>>>

// TODO: ????
export type bindGenericNodeInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferSchema<
		args[i & keyof args],
		$
	>
}

export const validateUninstantiatedGenericNode = (
	g: GenericSchema
): GenericSchema => {
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
	$: SchemaScope<$>
}

export class GenericSchema<
		params extends string[] = string[],
		def = any,
		$ = any
	>
	extends Callable<GenericNodeInstantiation<params, def, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"

	constructor(
		public params: params,
		public def: def,
		public $: SchemaScope<$>
	) {
		super((...args: SchemaDef[]) => {
			args
			// const argNodes: Record<string, RawSchema> = flatMorph(
			// 	params,
			// 	(i, param) => [param, $.schema(args[i])]
			// ) as never
			// { args: argNodes }
			return $.schema(def as never) as never
		})
	}
}
