import type { ArkErrors } from "@ark/schema"
import type { inferred } from "@ark/util"
import type { GenericParser } from "../generic.ts"
import type { Module } from "../module.ts"
import { scope, type Scope } from "../scope.ts"
import type {
	DeclarationParser,
	DefinitionParser,
	TypeParser
} from "../type.ts"
import { arkBuiltin } from "./builtin.ts"
import { arkPrototypes } from "./constructors/constructors.ts"
import { number } from "./number/number.ts"
import { string } from "./string/string.ts"
import { arkTs } from "./ts.ts"

export interface Ark
	extends Omit<Ark.keywords, keyof Ark.Wrapped>,
		Ark.Wrapped {}

export declare namespace Ark {
	export interface keywords extends arkTs, arkPrototypes, arkBuiltin {}

	export interface Wrapped {
		string: string.submodule
		number: number.submodule
	}
}

export const ambient: Scope<Ark> = scope(
	{
		...arkTs,
		...arkPrototypes,
		...arkBuiltin,
		string,
		number
	},
	{ prereducedAliases: true, ambient: true }
) as never

export const ark: Module<Ark> = ambient.export()

export const type: TypeParser<{}> = ambient.type as never

export declare namespace type {
	export type cast<t> = {
		[inferred]?: t
	}

	export type errors = ArkErrors
}

export const generic: GenericParser<{}> = ambient.generic as never

export const define: DefinitionParser<{}> = ambient.define as never

export const declare: DeclarationParser<{}> = ambient.declare as never
