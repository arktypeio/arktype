import { DynamicBase, flatMorph, noSuggest, type anyOrNever } from "@ark/util"
import type { BaseRoot } from "./roots/root.js"
import type {
	BaseScope,
	InternalResolution,
	InternalResolutions
} from "./scope.js"
import { arkKind, hasArkKind } from "./shared/utils.js"

export type PreparsedNodeResolution = {
	[arkKind]: "generic" | "module"
}

export const rootType = noSuggest("rootAlias")
export type rootType = typeof rootType

export class RootModule<
	exports extends {} = {},
	rootType extends BaseRoot | undefined = undefined
> extends DynamicBase<exports> {
	declare [rootType]: rootType

	// ensure `[arkKind]` is non-enumerable so it doesn't get spread on import/export
	get [arkKind](): "module" {
		return "module"
	}
}

export const setRootType = <module extends RootModule>(
	module: module,
	value: BaseRoot
): module =>
	Object.defineProperty(module, rootType, {
		enumerable: false,
		value
	})

export interface InternalModule<
	exports extends InternalResolutions = InternalResolutions
> extends RootModule<exports> {}

export const bindModule = (
	module: InternalModule,
	$: BaseScope
): InternalModule =>
	new RootModule(
		flatMorph(module, (alias, value) => [
			alias,
			hasArkKind(value, "module") ? bindModule(value, $) : value.bindScope($)
		])
	) as never

type exportSchemaScope<$> = {
	[k in keyof $]: $[k] extends InternalResolution ?
		[$[k]] extends [anyOrNever] ?
			BaseRoot
		:	$[k]
	:	BaseRoot
}

export const SchemaModule: new <$ = {}>(
	types: exportSchemaScope<$>
) => SchemaModule<$> = RootModule

export interface SchemaModule<$ = {}>
	extends RootModule<exportSchemaScope<$>> {}
