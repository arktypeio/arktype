import {
	DynamicBase,
	flatMorph,
	type anyOrNever,
	type inferred
} from "@ark/util"
import type { BaseRoot } from "./roots/root.ts"
import type {
	BaseScope,
	InternalResolution,
	InternalResolutions
} from "./scope.ts"
import { arkKind, hasArkKind } from "./shared/utils.ts"

export type PreparsedNodeResolution = {
	[arkKind]: "generic" | "module"
}

type inferrableIfRooted<exports> = exports &
	("$root" extends keyof exports ? { [inferred]: exports["$root"] } : {})

export class RootModule<exports extends {} = {}> extends DynamicBase<
	inferrableIfRooted<exports>
> {
	// ensure `[arkKind]` is non-enumerable so it doesn't get spread on import/export
	get [arkKind](): "module" {
		return "module"
	}
}

export interface InternalModule<
	exports extends InternalResolutions = InternalResolutions
> extends RootModule<exports> {
	$root?: BaseRoot
}

export const bindModule = (
	module: InternalModule,
	$: BaseScope
): InternalModule =>
	new RootModule(
		flatMorph(module, (alias, value) => [
			alias,
			hasArkKind(value, "module") ? bindModule(value, $) : value.bindScope($)
		])
	) as never

type exportSchemaScope<$> = {
	[k in keyof $]: instantiateRoot<$[k]>
}

export type instantiateRoot<t> =
	t extends InternalResolution ?
		[t] extends [anyOrNever] ?
			BaseRoot
		:	t
	:	BaseRoot

export const SchemaModule: new <$ = {}>(
	types: exportSchemaScope<$>
) => SchemaModule<$> = RootModule

export interface SchemaModule<$ = {}>
	extends RootModule<exportSchemaScope<$>> {}
