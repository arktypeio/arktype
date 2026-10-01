import {
	fixGlobalConfig,
	type ArkErrors,
	type arkKind,
	type flatResolutionsOf
} from "@ark/schema"
import { defineLazily, type Brand, type inferred } from "@ark/util"
import type { distill, InferredMorph, Out, To } from "../attributes.ts"
import type { DeclarationParser } from "../declare.ts"
import type { FnParser } from "../fn.ts"
import type { GenericParser } from "../generic.ts"
import type { MatchParser } from "../match.ts"
import type { BoundModule, Module } from "../module.ts"
import type {
	inferDefinition,
	validateDefinition
} from "../parser/definition.ts"
import { $arkTypeRegistry, scope, type bindThis, type Scope } from "../scope.ts"
import type {
	DefinitionParser,
	SchemaParser,
	Type,
	TypeParser
} from "../type.ts"
import type { BaseType } from "../variants/base.ts"
import type { instantiateType } from "../variants/instantiate.ts"
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

	export type flat = flatResolutionsOf<Ark>

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

// keywords are built on first reference, from the config as it is now
fixGlobalConfig()

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
	} as never,
	{ name: "ark" }
) as never

export const keywords: Module<Ark> = ark.internal.exportLazily() as never

// the keywords' own accessors, so that each resolves on first reference
// through either
Object.defineProperties(
	$arkTypeRegistry.ambient,
	Object.getOwnPropertyDescriptors(keywords)
)

const typeAttachments = {} as Ark.boundTypeAttachments<any>

for (const [k, resolve] of Object.entries({
	string: () => keywords.string.root,
	number: () => keywords.number.root,
	bigint: () => keywords.bigint,
	boolean: () => keywords.boolean,
	symbol: () => keywords.symbol,
	undefined: () => keywords.undefined,
	null: () => keywords.null,
	object: () => keywords.object.root,
	unknown: () => keywords.unknown.root,
	false: () => keywords.false,
	true: () => keywords.true,
	never: () => keywords.never,
	arrayIndex: () => keywords.Array.index,
	Key: () => keywords.Key,
	Record: () => keywords.Record,
	Array: () => keywords.Array.root,
	Date: () => keywords.Date
}))
	defineLazily(typeAttachments, k, resolve)

$arkTypeRegistry.typeAttachments = typeAttachments

export const type: TypeParser<{}> = Object.defineProperties(
	ark.type,
	// define attachments on ark's parser, which predates them. future scopes
	// bind these from the registry when their TypeParsers are instantiated
	Object.getOwnPropertyDescriptors(typeAttachments)
) as never

export declare namespace type {
	export interface cast<to> {
		[inferred]?: to
	}

	export type errors = ArkErrors

	export type validate<def, $ = {}, args = bindThis<def>> = validateDefinition<
		def,
		$,
		args
	>

	export type instantiate<def, $ = {}, args = bindThis<def>> = instantiateType<
		inferDefinition<def, $, args>,
		$
	>

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

	export type brand<t, id> =
		t extends InferredMorph<infer i, infer o> ?
			o["introspectable"] extends true ?
				(In: i) => To<Brand<o["t"], id>>
			:	(In: i) => Out<Brand<o["t"], id>>
		:	Brand<t, id>

	/** @ts-ignore cast variance */
	export interface Any<out t = any, $ = any> extends BaseType<t, $> {}
}

export type type<t = unknown, $ = {}> = Type<t, $>

export const match: MatchParser<{}> = ark.match as never

export const fn: FnParser<{}> = ark.fn as never

export const generic: GenericParser<{}> = ark.generic as never

export const schema: SchemaParser<{}> = ark.schema as never

export const define: DefinitionParser<{}> = ark.define as never

export const declare: DeclarationParser<{}> = ark.declare as never
