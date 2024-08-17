import type { ArkErrors } from "@ark/schema"
import type { inferred } from "../ast.js"
import type { GenericHktParser } from "../generic.js"
import type { Module } from "../module.js"
import { scope, type Scope } from "../scope.js"
import type {
	DeclarationParser,
	DefinitionParser,
	TypeParser
} from "../type.js"
import { arkBuiltin } from "./builtin.js"
import { arkFormat } from "./format.js"
import { arkJs } from "./js.js"
import { arkNumber } from "./number.js"
import { arkParse } from "./parse.js"
import { arkPlatform } from "./platform.js"
import { arkString } from "./string.js"
import { arkTs } from "./ts.js"
import { arkTypedArray } from "./typedArray.js"

export interface Ark extends Omit<Ark.infer, keyof Ark.Wrapped>, Ark.Wrapped {}

export namespace Ark {
	export interface infer
		extends arkTs.keywords,
			arkJs.keywords,
			arkPlatform.keywords,
			arkString.keywords,
			arkNumber.keywords,
			arkBuiltin.keywords {
		TypedArray: arkTypedArray.submodule
		parse: arkParse.submodule
		format: arkFormat.submodule
	}

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
