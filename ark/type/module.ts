import {
	RootModule,
	type arkKind,
	type GenericProps,
	type PreparsedNodeResolution
} from "@ark/schema"
import type { anyOrNever } from "@ark/util"
import type { Generic } from "./generic.js"
import type { instantiateType } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: instantiateExport<$[k], $>
}

export type instantiateExport<t, $> =
	t extends PreparsedNodeResolution ?
		[t] extends [anyOrNever] ? instantiateType<t, $>
		: t extends GenericProps<infer params, infer bodyDef, infer args$> ?
			Generic<params, bodyDef, $, args$>
		:	t
	:	instantiateType<t, $>

export const Module: new <$ = {}>(types: exportScope<$>) => Module<$> =
	RootModule as never

export type Module<$ = {}> = RootModule<exportScope<$>>
