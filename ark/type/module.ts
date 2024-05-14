import { RootModule, type PreparsedNodeResolution } from "@arktype/schema"
import type { anyOrNever } from "@arktype/util"
import type { Type } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution ?
		[$[k]] extends [anyOrNever] ?
			Type<$[k], $>
		:	$[k]
	:	Type<$[k], $>
}

export const Module: new <$ = {}>(types: exportScope<$>) => Module<$> =
	RootModule

export interface Module<$ = {}> extends RootModule<exportScope<$>> {}
