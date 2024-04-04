import { DynamicBase } from "@arktype/util"
import type { Schema } from "./base.js"
import type { GenericNode } from "./generic.js"
import type { exportedName } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export class ModuleNode<$ = any> extends DynamicBase<exportScope<$>> {
	private readonly [arkKind] = "moduleNode"
}

type PreparsedNodeResolution = GenericNode | ModuleNode

type exportScope<$ = any> = {
	[k in exportedName<$>]: $[k] extends PreparsedNodeResolution
		? [$[k]] extends [null]
			? // handle `Schema<any>` and `Schema<never>`
				Schema<$[k], $>
			: $[k]
		: Schema<$[k], $>
}
