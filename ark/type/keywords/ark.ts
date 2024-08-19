import type { ArkErrors } from "@ark/schema"
import type { inferred } from "@ark/util"
import type { GenericHktParser } from "../generic.ts"
import type { Module } from "../module.ts"
import { scope, type Scope } from "../scope.ts"
import type {
	DeclarationParser,
	DefinitionParser,
	TypeParser
} from "../type.ts"
import { arkBuiltin } from "./builtin.ts"
import { arkNumber } from "./number/number.ts"
import { arkObject } from "./object/object.ts"
import { arkString } from "./string/string.ts"
import { arkTs } from "./ts.ts"

export interface Ark
	extends Omit<Ark.keywords, keyof Ark.Wrapped>,
		Ark.Wrapped {}

export declare namespace Ark {
	export interface keywords extends arkTs.submodule, arkBuiltin.submodule {}

	export interface Wrapped {
		string: arkString
		number: arkNumber.submodule
		object: arkObject.submodule
	}
}

export const ambient: Scope<Ark> = scope(
	{
		...arkTs.keywords,
		...arkBuiltin.keywords,
		string: arkString,
		number: arkNumber.submodule,
		object: arkObject.submodule
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

export const generic: GenericHktParser<{}> = ambient.generic as never

export const define: DefinitionParser<{}> = ambient.define as never

export const declare: DeclarationParser<{}> = ambient.declare as never
