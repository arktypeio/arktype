import {
	DynamicBase,
	type Hkt,
	type instantiate,
	type isAny,
	type isAnyOrNever
} from "@arktype/util"
import type { Schema } from "./base.js"
import type { GenericSchema } from "./generic.js"
import type { BaseSchema, arkKind } from "./main.js"
import type { exportedNameOf } from "./scope.js"

export type PreparsedNodeResolution = GenericSchema | SchemaModule

export type exportScope<$, hkt extends Hkt.Kind> = {
	[k in exportedNameOf<$>]: $[k] extends PreparsedNodeResolution
		? isAnyOrNever<$[k]> extends true
			? instantiate<hkt, [$[k], $]>
			: $[k]
		: instantiate<hkt, [$[k], $]>
}

export class SchemaModule<$ = any, hkt extends Hkt.Kind = BaseSchema>
	extends DynamicBase<exportScope<$, hkt>>
	implements Hkt.Kind
{
	declare readonly [arkKind]: "module"

	declare [Hkt.args]: unknown
	declare hkt: (args: this[Hkt.args]) => SchemaModule<typeof args>
}
