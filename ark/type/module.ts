import { RootModule, type PreparsedNodeResolution } from "@ark/schema"
import type { anyOrNever } from "@ark/util"
import type { Type } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution ?
		[$[k]] extends [anyOrNever] ?
			Type<$[k], $>
		:	$[k]
	:	Type<$[k], $>
}

export const Module: new <$ = {}>(types: exportScope<$>) => Module<$> =
	RootModule as never

export type Module<$ = {}> = RootModule<exportScope<$>>
