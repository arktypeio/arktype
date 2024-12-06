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

export type ParsedValueKind = "plain" | "optional" | "defaultable"

export type ParsedValue =
	| ParsedRequiredValue
	| ParsedOptionalValue
	| ParsedDefaultableValue

export type ParsedRequiredValue = {
	kind: "plain"
	valueNode: BaseRoot
}

export type ParsedOptionalValue = {
	kind: "optional"
	valueNode: BaseRoot
}

export type ParsedDefaultableValue = {
	kind: "defaultable"
	value: BaseRoot
	default: unknown
}

export const parseValue = (
	def: unknown,
	ctx: BaseParseContext
): ParsedValue => {
	if (isArray(def)) {
		if (def[1] === "=") {
			return {
				kind: "defaultable",
				value: ctx.$.parseOwnDefinitionFormat(def[0], ctx),
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

export type validateValue<def, keyKind extends ParsedKeyKind, $, args> =
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
	: def extends DefaultValueTuple ?
		validateDefaultValueTuple<def, keyKind, $, args>
	: def extends OptionalValueTuple ?
		validateOptionalValueTuple<def, keyKind, $, args>
	: keyKind extends "spread" ?
		validateSpread<def, inferDefinition<def, $, args>, $, args>
	: keyKind extends "undeclared" ? UndeclaredKeyBehavior
	: validateDefinition<def, $, args>

type validateSpread<def, inferredValue, $, args> =
	inferredValue extends object ? validateDefinition<def, $, args>
	:	ErrorType<writeInvalidSpreadTypeMessage<typeToString<inferredValue>>>

type validateDefaultValueTuple<
	def extends DefaultValueTuple,
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

type validateOptionalValueTuple<
	def extends OptionalValueTuple,
	keyKind extends ParsedKeyKind,
	$,
	args
> =
	keyKind extends "required" ?
		conform<def, readonly [validateDefinition<def[0], $, args>, "?"]>
	:	ErrorMessage<invalidOptionalKeyKindMessage>

export type DefaultValueDefinition = DefaultValueTuple

export type DefaultValueTuple<
	baseDef = unknown,
	thunkableValue = unknown
> = readonly [baseDef, "=", thunkableValue]

export type OptionalValueDefinition = OptionalValueTuple

export type OptionalValueTuple<baseDef = unknown> = readonly [baseDef, "?"]

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidOptionalKeyKindMessage = `Only required keys may make their values optional, e.g. { [mySymbol]: ['number', '?'] }`

export type invalidOptionalKeyKindMessage = typeof invalidOptionalKeyKindMessage

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidDefaultKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

export type invalidDefaultKeyKindMessage = typeof invalidDefaultKeyKindMessage
