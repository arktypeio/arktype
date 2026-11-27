import {
	RootModule,
	type arkKind,
	type GenericAst,
	type PreparsedNodeResolution
} from "@ark/schema"
import type { anyOrNever, inferred, noSuggest } from "@ark/util"
import type { distill } from "./attributes.ts"
import type { Generic } from "./generic.ts"
import type { Type } from "./type.ts"

export const Module: new <$ extends {}>(exports: exportScope<$>) => Module<$> =
	RootModule as never

export interface Module<$ extends {} = {}> extends RootModule<exportScope<$>> {}

export declare namespace Module {
	/**
	 * #### map each exported `Type` in a `Module` to its inferred output type, recursing into nested submodules
	 *
	 * @example
	 * const mod = type.module({ User: { name: "string", age: "number = 0" } })
	 * // { User: { name: string; age: number } }
	 * type ModTypes = Module.infer<typeof mod>
	 */
	export type infer<m extends RootModule> = inferModule<m, "out">

	export namespace infer {
		/**
		 * #### map each exported `Type` in a `Module` to its inferred input type, recursing into nested submodules
		 *
		 * @example
		 * const mod = type.module({ User: { name: "string", age: "number = 0" } })
		 * // { User: { name: string; age?: number } }
		 * type ModInputs = Module.infer.In<typeof mod>
		 */
		export type In<m extends RootModule> = inferModule<m, "in">

		/**
		 * #### map each exported `Type` in a `Module` to its inferred output type, recursing into nested submodules
		 *
		 * @example
		 * const mod = type.module({ User: { name: "string", age: "number = 0" } })
		 * // { User: { name: string; age: number } }
		 * type ModOutputs = Module.infer.Out<typeof mod>
		 */
		export type Out<m extends RootModule> = inferModule<m, "out">
	}
}

export type isGenericExport<v> =
	[v] extends [anyOrNever] ? false
	: [v] extends [{ [arkKind]: "generic" }] ? true
	: false

type inferModule<m, side extends "in" | "out"> = {
	[k in Exclude<keyof m, noSuggest> as isGenericExport<m[k]> extends true ?
		never
	:	k]: [m[k]] extends [anyOrNever] ? m[k]
	: [m[k]] extends [{ [arkKind]: "module" }] ? inferModule<m[k], side>
	: [m[k]] extends [{ [inferred]: unknown; infer: unknown; inferIn: unknown }] ?
		m[k][side extends "out" ? "infer" : "inferIn"]
	:	distill<m[k], side>
}

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
		("root" extends keyof exports ? { [inferred]: exports["root"] } : {})
>

export type instantiateExport<t, $> =
	[t] extends [PreparsedNodeResolution] ?
		[t] extends [anyOrNever] ? Type<t, $>
		: t extends GenericAst<infer params, infer body, infer body$, any> ?
			Generic<params, body, body$, $>
		: t extends Submodule<infer exports> ? BoundModule<exports, $>
		: never
	:	Type<t, $>
