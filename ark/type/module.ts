import { RootModule, type arkKind, type GenericProps } from "@ark/schema"
import type { anyOrNever } from "@ark/util"
import type { Generic } from "./generic.js"
import type { Type } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: $[k] extends { [arkKind]: "module" } ?
		[$[k]] extends [anyOrNever] ?
			Type<$[k], $>
		:	$[k]
	: $[k] extends GenericProps<infer params, infer bodyDef, infer args$> ?
		Generic<params, bodyDef, $, args$>
	:	Type<$[k], $>
}

export const Module: new <$ = {}>(types: exportScope<$>) => Module<$> =
	RootModule as never

export type Module<$ = {}> = RootModule<exportScope<$>>
