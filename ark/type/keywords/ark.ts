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
import { arkFormat } from "./format.ts"
import { arkJs } from "./js.ts"
import { arkNumber } from "./number.ts"
import { arkParse } from "./parse.ts"
import { arkPlatform } from "./platform.ts"
import { arkString } from "./string.ts"
import { arkTs } from "./ts.ts"
import { arkTypedArray } from "./typedArray.ts"

export interface Ark
	extends Omit<Ark.keywords, keyof Ark.Wrapped>,
		Ark.Wrapped {
	TypedArray: arkTypedArray.submodule
	parse: arkParse.submodule
	format: arkFormat.submodule
}

export namespace Ark {
	export interface keywords
		extends arkTs.keywords,
			arkJs.keywords,
			arkPlatform.keywords,
			arkString.keywords,
			arkNumber.keywords,
			arkBuiltin.keywords {}

	export interface Wrapped {
		string: arkString.submodule
		number: arkNumber.submodule
	}
}

export const ambient: Scope<Ark> = scope(
	{
		...arkTs.keywords,
		...arkJs.keywords,
		...arkPlatform.keywords,
		...arkString.keywords,
		...arkNumber.keywords,
		...arkBuiltin.keywords,
		string: arkString.submodule,
		number: arkNumber.submodule,
		TypedArray: arkTypedArray.submodule,
		parse: arkParse.submodule,
		format: arkFormat.submodule
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
