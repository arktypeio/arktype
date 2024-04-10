import { DynamicBase, type isAnyOrNever } from "@arktype/util"
import type { arkKind } from "../main.js"
import type { Schema } from "./schema.js"

export type PreparsedNodeResolution = { [arkKind]: "generic" | "module" }

export type exportScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution
		? isAnyOrNever<$[k]> extends true
			? Schema<$[k], $>
			: $[k]
		: Schema<$[k], $>
}

export class SchemaModule<$ = any> extends DynamicBase<exportScope<$>> {
	declare readonly [arkKind]: "module"
}
