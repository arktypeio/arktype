import { DynamicBase } from "@arktype/util"
import type { Schema } from "./base.js"
import type { GenericSchema } from "./generic.js"
import type { exportedNameOf } from "./scope.js"

export type PreparsedNodeResolution = GenericSchema | SchemaModule

export type exportScope<$ = any> = {
	[k in exportedNameOf<$>]: $[k] extends PreparsedNodeResolution
		? [$[k]] extends [null]
			? // handle `Schema<any>` and `Schema<never>`
				Schema<$[k], $>
			: $[k]
		: Schema<$[k], $>
}

export class SchemaModule<$ = any> extends DynamicBase<exportScope<$>> {}
