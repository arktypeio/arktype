import {
	RootModule,
	type GenericAst,
	type PreparsedNodeResolution
} from "@ark/schema"
import type { anyOrNever, inferred } from "@ark/util"
import type { Generic } from "./generic.ts"
import type { Type } from "./type.ts"

export const Module: new <$ extends {}>(exports: exportScope<$>) => Module<$> =
	RootModule as never

export interface Module<$ extends {} = {}> extends RootModule<exportScope<$>> {}

export type exportScope<$> = bindExportsToScope<$, $>

export const BoundModule: new <exports extends {}, $ extends {}>(
	exports: bindExportsToScope<exports, $>,
	$: $
) => BoundModule<exports, $> = RootModule as never

export interface BoundModule<exports extends {}, $>
	extends RootModule<bindExportsToScope<exports, $>> {}

export type bindExportsToScope<exports, $> = {
	[k in keyof exports]: instantiateExport<exports[k], $>
} & unknown

export type Submodule<exports extends {}> = RootModule<
	exports &
		("$root" extends keyof exports ? { [inferred]: exports["$root"] } : {})
>

export type instantiateExport<t, $> =
	[t] extends [PreparsedNodeResolution] ?
		[t] extends [anyOrNever] ? Type<t, $>
		: t extends GenericAst<infer params, infer body, infer body$> ?
			Generic<params, body, body$, $>
		: t extends Submodule<infer exports> ? BoundModule<exports, $>
		: never
	:	Type<t, $>
