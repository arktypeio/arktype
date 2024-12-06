import type {
	BaseParseContext,
	BaseRoot,
	UndeclaredKeyBehavior
} from "@ark/schema"
import {
	isArray,
	type anyOrNever,
	type conform,
	type ErrorMessage,
	type ErrorType,
	type typeToString
} from "@ark/util"
import type { DefaultFor } from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import type {
	ParsedKeyKind,
	writeInvalidSpreadTypeMessage
} from "./objectLiteral.ts"

export type ParsedPropertyKind = "plain" | "optional" | "defaultable"

export type ParsedProperty =
	| ParsedRequiredProperty
	| ParsedOptionalProperty
	| ParsedDefaultableProperty

export type ParsedRequiredProperty = {
	kind: "plain"
	valueNode: BaseRoot
}

export type ParsedOptionalProperty = {
	kind: "optional"
	valueNode: BaseRoot
}

export type ParsedDefaultableProperty = {
	kind: "defaultable"
	valueNode: BaseRoot
	default: unknown
}

export const parseProperty = (
	def: unknown,
	ctx: BaseParseContext
): ParsedProperty => {
	if (isArray(def)) {
		if (def[1] === "=") {
			return {
				kind: "defaultable",
				valueNode: ctx.$.parseOwnDefinitionFormat(def[0], ctx),
				default: def[2]
			}
		}

		if (def[1] === "?") {
			return {
				kind: "optional",
				valueNode: ctx.$.parseOwnDefinitionFormat(def[0], ctx)
			}
		}
	}

	return {
		kind: "plain",
		valueNode: ctx.$.parseOwnDefinitionFormat(def, ctx)
	}
}

export type validateProperty<def, keyKind extends ParsedKeyKind, $, args> =
	[def] extends [anyOrNever] ?
		/** this extra [anyOrNever] check is required to ensure that nested `type` invocations
		 * like the following are not prematurely validated by the outer call:
		 *
		 * ```ts
		 * type({
		 * 	"test?": type("string").pipe(x => x === "true")
		 * })
		 * ```
		 */
		def
	: def extends DefaultablePropertyTuple ?
		validateDefaultablePropertyTuple<def, keyKind, $, args>
	: def extends OptionalPropertyTuple ?
		validateOptionalPropertyTuple<def, keyKind, $, args>
	: keyKind extends "spread" ?
		validateSpread<def, inferDefinition<def, $, args>, $, args>
	: keyKind extends "undeclared" ? UndeclaredKeyBehavior
	: validateDefinition<def, $, args>

type validateSpread<def, inferredProperty, $, args> =
	inferredProperty extends object ? validateDefinition<def, $, args>
	:	ErrorType<writeInvalidSpreadTypeMessage<typeToString<inferredProperty>>>

type validateDefaultablePropertyTuple<
	def extends DefaultablePropertyTuple,
	keyKind extends ParsedKeyKind,
	$,
	args
> =
	keyKind extends "required" ?
		conform<
			def,
			readonly [
				validateDefinition<def[0], $, args>,
				"=",
				DefaultFor<type.infer.In<def[0], $, args>>
			]
		>
	:	ErrorMessage<invalidDefaultKeyKindMessage>

type validateOptionalPropertyTuple<
	def extends OptionalPropertyTuple,
	keyKind extends ParsedKeyKind,
	$,
	args
> =
	keyKind extends "required" ?
		conform<def, readonly [validateDefinition<def[0], $, args>, "?"]>
	:	ErrorMessage<invalidOptionalKeyKindMessage>

export type DefaultPropertyDefinition = DefaultablePropertyTuple

export type DefaultablePropertyTuple<
	baseDef = unknown,
	thunkableProperty = unknown
> = readonly [baseDef, "=", thunkableProperty]

export type OptionalPropertyDefinition = OptionalPropertyTuple

export type OptionalPropertyTuple<baseDef = unknown> = readonly [baseDef, "?"]

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidOptionalKeyKindMessage = `Only required keys may make their values optional, e.g. { [mySymbol]: ['number', '?'] }`

export type invalidOptionalKeyKindMessage = typeof invalidOptionalKeyKindMessage

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidDefaultKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

export type invalidDefaultKeyKindMessage = typeof invalidDefaultKeyKindMessage
