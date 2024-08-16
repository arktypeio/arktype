import type { ArkErrors } from "@ark/schema"
import type { inferred } from "../ast.js"
import type { GenericHktParser } from "../generic.js"
import type { Module, Submodule } from "../module.js"
import { scope, type Scope } from "../scope.js"
import type {
	DeclarationParser,
	DefinitionParser,
	TypeParser
} from "../type.js"
import { arkGenericsModule, type arkGenericsExports } from "./arkGenerics.js"
import { formattingModule, type formattingExports } from "./format.js"
import { internalModule, type internalExports } from "./internal.js"
import { jsObjectsModule, type jsObjectExports } from "./jsObjects.js"
import { parsingModule, type parsingExports } from "./parsing.js"
import {
	platformObjectsModule,
	type platformObjectExports
} from "./platformObjects.js"
import { stringModule } from "./string.js"
import { tsGenericsModule, type tsGenericsExports } from "./tsGenerics.js"
import { tsKeywordsModule, type tsKeywordExports } from "./tsKeywords.js"
import { typedArrayModule, type typedArrayExports } from "./typedArray.js"
import { validationModule, type validationExports } from "./validation.js"

export type WrappedArkKey = "string"

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface Ark
	// remove base inference for keywords that have dedicated submodules
	extends Omit<Ark.infer, WrappedArkKey> {
	string: stringModule
}

export namespace Ark {
	export interface infer
		extends tsKeywordExports,
			jsObjectExports,
			platformObjectExports,
			validationExports,
			tsGenericsExports,
			arkGenericsExports,
			internalExports {
		TypedArray: Submodule<typedArrayExports>
		parse: Submodule<parsingExports>
		format: Submodule<formattingExports>
	}
}

export const ambient: Scope<Ark> = scope(
	{
		...tsKeywordsModule,
		...jsObjectsModule,
		...platformObjectsModule,
		...validationModule,
		...internalModule,
		...tsGenericsModule,
		...arkGenericsModule,
		string: stringModule,
		TypedArray: typedArrayModule,
		parse: parsingModule,
		format: formattingModule
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
