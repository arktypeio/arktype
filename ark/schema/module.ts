import { DynamicBase, type anyOrNever } from "@ark/util"
import type { BaseRoot } from "./roots/root.js"
import { arkKind } from "./shared/utils.js"

export type PreparsedNodeResolution = {
	[arkKind]: "generic" | "module"
}

export class RootModule<
	exports extends object = {}
> extends DynamicBase<exports> {
	// ensure `[arkKind]` is non-enumerable so it doesn't get spread on import/export
	get [arkKind](): "module" {
		return "module"
	}
}

type exportSchemaScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution ?
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
