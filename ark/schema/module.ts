import {
	DynamicBase,
	type Hkt,
	type instantiate,
	type isAnyOrNever
} from "@arktype/util"
import type { BaseSchema, arkKind } from "./main.js"
import type { exportedNameOf } from "./scope.js"

export type PreparsedNodeResolution = { [arkKind]: "generic" | "module" }

export type exportScope<$, instance extends BaseSchema> = {
	[k in exportedNameOf<$>]: $[k] extends PreparsedNodeResolution
		? isAnyOrNever<$[k]> extends true
			? instantiate<instance, [$[k], $]>
			: $[k]
		: instantiate<instance, [$[k], $]>
}

export class SchemaModule<
	$ = any,
	node extends BaseSchema = BaseSchema
> extends DynamicBase<exportScope<$, node>> {
	declare readonly [arkKind]: "module"

	declare [Hkt.args]: unknown
	declare [Hkt.instantiate]: (
		args: this[Hkt.args]
	) => SchemaModule<typeof args>
}
