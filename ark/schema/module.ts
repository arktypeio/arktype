import { DynamicBase, type anyOrNever } from "@arktype/util"
import type { Root } from "./roots/root.js"
import { addArkKind, arkKind } from "./shared/utils.js"

export type PreparsedNodeResolution = {
	[arkKind]: "generic" | "module"
}

type exportRootScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution ?
		[$[k]] extends [anyOrNever] ?
			Root<$[k], $>
		:	$[k]
	:	Root<$[k], $>
}

export class RootModule<$ = any> extends DynamicBase<exportRootScope<$>> {
	declare readonly [arkKind]: "module"

	constructor(types: exportRootScope<$>) {
		super(types)
		// ensure `[arkKind]` is non-enumerable so it doesn't get spread on import/export
		addArkKind(this as never, "module")
	}
}
