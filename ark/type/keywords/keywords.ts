import type { ArkErrors, arkKind } from "@ark/schema"
import type { Brand, inferred } from "@ark/util"
import type { distill, InferredMorph, Out, To } from "../attributes.ts"
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
import { arkPrototypes } from "./constructors.ts"
import { number } from "./number.ts"
import { string } from "./string.ts"
import { arkTsGenerics, arkTsKeywords, object, unknown } from "./ts.ts"

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
		object: object.submodule
		unknown: unknown.submodule
	}

	export interface typeAttachments extends arkTsKeywords.$ {
		arrayIndex: arkPrototypes.$["Array"]["index"]
		Key: arkBuiltins.$["Key"]
		Record: arkTsGenerics.$["Record"]
		Date: arkPrototypes.$["Date"]
		Array: arkPrototypes.$["Array"]["root"]
	}

	export interface boundTypeAttachments<$>
		extends Omit<BoundModule<typeAttachments, $>, arkKind> {}
}

$arkTypeRegistry.typeAttachments = {
	...arkTsKeywords,
	arrayIndex: arkPrototypes.Array.index,
	Key: arkBuiltins.Key,
	Record: arkTsGenerics.Record,
	Array: arkPrototypes.Array.root,
	Date: arkPrototypes.Date
}

export const ark: Scope<Ark> = scope(
	{
		...arkTsKeywords,
		...arkTsGenerics,
		...arkPrototypes,
		...arkBuiltins,
		string,
		number,
		object,
		unknown
	},
	{ prereducedAliases: true, ambient: true }
) as never

export const keywords: Module<Ark> = ark.export()

export const type: TypeParser<{}> = ark.type as never

export declare namespace type {
	export interface cast<to> {
		[inferred]?: to
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

	export type brand<t, id> =
		t extends InferredMorph<infer i, infer o> ?
			o["introspectable"] extends true ?
				(In: i) => To<Brand<o["t"], id>>
			:	(In: i) => Out<Brand<o["t"], id>>
		:	Brand<t, id>
}

export type type<t = unknown, $ = {}> = Type<t, $>

export const generic: GenericParser<{}> = ark.generic as never

export const schema: SchemaParser<{}> = ark.schema as never

export const define: DefinitionParser<{}> = ark.define as never

export const declare: DeclarationParser<{}> = ark.declare as never
