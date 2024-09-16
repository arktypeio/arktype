import type { ArkErrors, arkKind } from "@ark/schema"
import type { inferred } from "@ark/util"
import type { GenericParser } from "../generic.ts"
import type { BaseType } from "../methods/base.ts"
import type { BoundModule, Module } from "../module.ts"
import type {
	inferDefinition,
	validateDefinition
} from "../parser/definition.ts"
import { $arkTypeRegistry, scope, type bindThis, type Scope } from "../scope.ts"
import type {
	DeclarationParser,
	DefinitionParser,
	SchemaParser,
	Type,
	TypeParser
} from "../type.ts"
import { arkBuiltins } from "./builtins.ts"
import { arkPrototypes } from "./constructors/constructors.ts"
import type { distill } from "./inference.ts"
import { number } from "./number/number.ts"
import { string } from "./string/string.ts"
import { arkTsGenerics, arkTsKeywords, unknown } from "./ts.ts"

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
		unknown: unknown.submodule
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

export const ark: Scope<Ark> = scope(
	{
		...arkTsKeywords,
		...arkTsGenerics,
		...arkPrototypes,
		...arkBuiltins,
		string,
		number,
		unknown
	},
	{ prereducedAliases: true, ambient: true }
) as never

export const keywords: Module<Ark> = ark.export()

export const type: TypeParser<{}> = ark.type as never

export declare namespace type {
	export type cast<t> = {
		[inferred]?: t
	}

	export type errors = ArkErrors

	/** @ts-ignore cast variance */
	export interface Any<out t = any> extends BaseType<t, any> {}

	export type infer<def, $ = {}, args = bindThis<def>> = inferDefinition<
		def,
		$,
		args
	>

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

	export type validate<def, $ = {}, args = bindThis<def>> = validateDefinition<
		def,
		$,
		args
	>
}

export type type<t = unknown, $ = {}> = Type<t, $>

export const generic: GenericParser<{}> = ark.generic as never

export const schema: SchemaParser<{}> = ark.schema as never

export const define: DefinitionParser<{}> = ark.define as never

export const declare: DeclarationParser<{}> = ark.declare as never
