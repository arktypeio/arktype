import type { PreparsedNodeResolution, arkKind } from "@arktype/schema"
import { DynamicBase, type anyOrNever } from "@arktype/util"
import type { Type } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution ?
		[$[k]] extends [anyOrNever] ?
			Type<$[k], $>
		:	$[k]
	:	Type<$[k], $>
}

export class Module<$ = any> extends DynamicBase<exportScope<$>> {
	declare readonly [arkKind]: "module"
}
