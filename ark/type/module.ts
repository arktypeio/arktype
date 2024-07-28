import { RootModule, type arkKind, type GenericProps } from "@ark/schema"
import type { anyOrNever } from "@ark/util"
import type { Generic } from "./generic.js"
import type { Data } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: $[k] extends { [arkKind]: "module" } ?
		[$[k]] extends [anyOrNever] ?
			Data<$[k], $>
		:	$[k]
	: $[k] extends GenericProps<infer params, infer bodyDef, infer args$> ?
		Generic<params, bodyDef, $, args$>
	:	Data<$[k], $>
}

export const Module: new <$ = {}>(types: exportScope<$>) => Module<$> =
	RootModule as never

export type Module<$ = {}> = RootModule<exportScope<$>>
