import {
	RootModule,
	type GenericRoot,
	type PreparsedNodeResolution
} from "@ark/schema"
import type { anyOrNever } from "@ark/util"
import type { Generic } from "./generic.js"
import type { Type } from "./type.js"

export type exportScope<$> = {
	[k in keyof $]: instantiateExport<$[k], $>
} & unknown

export type instantiateExport<t, $> =
	[t] extends [PreparsedNodeResolution] ?
		[t] extends [anyOrNever] ? Type<t, $>
		: t extends GenericRoot<infer params, infer body> ? Generic<params, body>
		: t
	:	Type<t, $>

export const Module: new <$>(types: exportScope<$>) => Module<$> =
	RootModule as never

export interface Module<$ = {}> extends RootModule<exportScope<$>> {}
