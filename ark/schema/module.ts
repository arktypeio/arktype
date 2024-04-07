import { DynamicBase, type Hkt, type isAny } from "@arktype/util"
import type { Schema } from "./base.js"
import type { GenericSchema } from "./generic.js"
import type { BaseSchema, arkKind } from "./main.js"
import type { exportedNameOf } from "./scope.js"

export type PreparsedNodeResolution = GenericSchema | SchemaModule

export type exportScope<$ = any> = {
	[k in exportedNameOf<$>]: $[k] extends PreparsedNodeResolution
		? isAny<$[k]> extends true
			? Schema<$[k], $>
			: never extends $[k]
				? Schema<$[k], $>
				: $[k]
		: Schema<$[k], $>
}

export class SchemaModule<$ = any> extends DynamicBase<exportScope<$>> {
	declare readonly [arkKind]: "module"
}
