import type { PreparsedNodeResolution, arkKind } from "@arktype/schema"
import { DynamicBase, type isAnyOrNever } from "@arktype/util"
import type { Type } from "./type.js"

type exportScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution ?
		isAnyOrNever<$[k]> extends true ?
			Type<$[k], $>
		:	$[k]
	:	Type<$[k], $>
}

export class Module<$ = any> extends DynamicBase<exportScope<$>> {
	declare readonly [arkKind]: "module"
}
