import { arkKind, keywordNodes } from "@arktype/schema"
import { Callable, flatMorph, type conform } from "@arktype/util"
import type { inferDefinition } from "./parser/definition.js"
import type {
	GenericParamsParseError,
	parseGenericParams
} from "./parser/generic.js"
import type { Scope } from "./scope.js"
import type { inferTypeRoot, Type, validateTypeRoot } from "./type.js"

export type BoundArgs = Record<string, Type>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
export type GenericInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<
		args,
		{
			[i in keyof params]: validateTypeRoot<args[i & keyof args], $>
		}
	>
) => Type<inferDefinition<def, $, bindGenericInstantiation<params, $, args>>, $>

type bindGenericInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}

export const generic = <params extends string[], def, $>(
	params: params,
	def: def,
	$: Scope<$>
): Generic<params, def, $> => new Generic(params, def, $)

export class Generic<
	params extends string[] = string[],
	def = unknown,
	$ = any
> extends Callable<GenericInstantiation<params, def, $>> {
	readonly [arkKind] = "generic"

	constructor(
		public parameters: params,
		public def: def,
		public $: Scope<$>
	) {
		super((...args) => {
			const argNodes = flatMorph(parameters, (i, param) => [
				param,
				$.parseTypeRoot(args[i])
			])
			return $.parseTypeRoot(def, { args: argNodes })
		})
	}
}

export type validateParameterString<params extends string> =
	parseGenericParams<params> extends GenericParamsParseError<infer message>
		? message
		: params

export const validateUninstantiatedGeneric = (g: Generic): Generic => {
	// the unconstrained instantiation of the generic is not used for now
	// other than to eagerly validate that the def does not contain any errors
	g.$.parseTypeRoot(
		g.def,
		// once we support constraints on generic parameters, we'd use
		// the base type here: https://github.com/arktypeio/arktype/issues/796
		{
			baseName: "generic",
			args: flatMorph(g.parameters, (_, name) => [name, keywordNodes.unknown])
		}
	)
	return g
}
