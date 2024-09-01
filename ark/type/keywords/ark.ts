import type { ArkErrors, arkKind } from "@ark/schema"
import type { inferred } from "@ark/util"
import type { GenericParser } from "../generic.ts"
import type { BoundModule, Module } from "../module.ts"
import type { inferDefinition } from "../parser/definition.ts"
import { $arkTypeRegistry, scope, type Scope } from "../scope.ts"
import type {
	DeclarationParser,
	DefinitionParser,
	Type,
	TypeParser,
	validateTypeRoot
} from "../type.ts"
import type { distill } from "./ast.ts"
import { arkBuiltins } from "./builtins.ts"
import { arkPrototypes } from "./constructors/constructors.ts"
import { number } from "./number/number.ts"
import { string } from "./string/string.ts"
import { arkTsGenerics, arkTsKeywords } from "./ts.ts"

export interface Ark
	extends Omit<Ark.keywords, keyof Ark.wrapped>,
		Ark.wrapped {}

export declare namespace Ark {
	export interface keywords
		extends arkTsKeywords.$,
			arkTsGenerics.$,
			// don't include TypedArray since it is only a Module
			arkPrototypes.keywords,
			arkBuiltins.$ {}

	export interface wrapped extends arkPrototypes.wrapped {
		string: string.submodule
		number: number.submodule
	}

	export interface typeAttachments extends arkTsKeywords.$ {
		Key: arkBuiltins.$["Key"]
		Record: arkTsGenerics.$["Record"]
	}

	export interface boundTypeAttachments<$>
		extends Omit<BoundModule<typeAttachments, $>, arkKind> {}
}

$arkTypeRegistry.typeAttachments = {
	...arkTsKeywords,
	Key: arkBuiltins.Key,
	Record: arkTsGenerics.Record
}

export const ambient: Scope<Ark> = scope(
	{
		...arkTsKeywords,
		...arkTsGenerics,
		...arkPrototypes,
		...arkBuiltins,
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

	export type infer<def, $ = {}, args = {}> = inferDefinition<def, $, args>

	export namespace infer {
		export type In<def, $ = {}, args = {}> = distill.In<
			inferDefinition<def, $, args>
		>

		export type Out<def, $ = {}, args = {}> = distill.Out<
			inferDefinition<def, $, args>
		>

		export namespace brandable {
			export type In<def, $ = {}, args = {}> = distill.brandable.In<
				inferDefinition<def, $, args>
			>

			export type Out<def, $ = {}, args = {}> = distill.brandable.Out<
				inferDefinition<def, $, args>
			>
		}

		export namespace introspectable {
			export type Out<def, $ = {}, args = {}> = distill.introspectable.Out<
				inferDefinition<def, $, args>
			>
		}
	}

	export type validate<def, $ = {}> = validateTypeRoot<def, $>
}

export type type<t = unknown, $ = {}> = Type<t, $>

export const generic: GenericParser<{}> = ambient.generic as never

export const define: DefinitionParser<{}> = ambient.define as never

export const declare: DeclarationParser<{}> = ambient.declare as never
