import { DynamicBase, flatMorph, type anyOrNever } from "@ark/util"
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

export class RootModule<exports extends {} = {}> extends DynamicBase<exports> {
	// ensure `[arkKind]` is non-enumerable so it doesn't get spread on import/export
	get [arkKind](): "module" {
		return "module"
	}
}

export interface InternalModule<
	exports extends InternalResolutions = InternalResolutions
> extends RootModule<exports> {
	$root?: BaseRoot
}

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
