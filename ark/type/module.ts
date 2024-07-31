import { RootModule, type PreparsedNodeResolution } from "@ark/schema"
import type { anyOrNever } from "@ark/util"
import type { instantiateType } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: instantiateExport<$[k], $>
}

export type instantiateExport<t, $> =
	[t] extends [PreparsedNodeResolution] ?
		[t] extends [anyOrNever] ?
			instantiateType<t, $>
		:	t
	:	instantiateType<t, $>

export const Module: new <$>(types: exportScope<$>) => Module<$> =
	RootModule as never

export type Module<$ = {}> = RootModule<exportScope<$>>
