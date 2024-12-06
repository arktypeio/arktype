import {
	ArkErrors,
	writeUnassignableDefaultValueMessage,
	type BaseParseContext,
	type BaseRoot,
	type UndeclaredKeyBehavior
} from "@ark/schema"
import {
	isArray,
	printable,
	throwParseError,
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
	PreparsedKeyKind,
	writeInvalidSpreadTypeMessage
} from "./objectLiteral.ts"

export type validateEntry<def, keyKind extends PreparsedKeyKind, $, args> =
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
	keyKind extends PreparsedKeyKind,
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
	keyKind extends PreparsedKeyKind,
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

export type ParsedValue =
	| ParsedBaseValue
	| ParsedOptionalValue
	| ParsedDefaultValue

type ParsedBaseValue = {
	kind: "raw"
	node: BaseRoot
}

type ParsedOptionalValue = {
	kind: "optional"
	node: BaseRoot
}

type ParsedDefaultValue = {
	kind: "default"
	node: BaseRoot
	value: unknown
}

export const parsePropertyValue = (
	value: unknown,
	ctx: BaseParseContext
): ParsedValue => {
	if (!isArray(value) || (value[0] !== "=" && value[0] !== "?"))
		return { kind: "raw", node: ctx.$.parseOwnDefinitionFormat(value, ctx) }

	const parsedValue = ctx.$.parseOwnDefinitionFormat(value[0], ctx)

	if (value[1] === "?") {
		return {
			kind: "optional",
			node: parsedValue
		}
	}

	const out = parsedValue.traverse(value[2])
	if (out instanceof ArkErrors) {
		throwParseError(
			writeUnassignableDefaultValueMessage(
				printable(parsedKey.key),
				out.message
			)
		)
	}

	return {
		kind: "default",
		node: parsedValue,
		value: value[2]
	}
}

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidOptionalKeyKindMessage = `Only required keys may make their values optional, e.g. { [mySymbol]: ['number', '?'] }`

export type invalidOptionalKeyKindMessage = typeof invalidOptionalKeyKindMessage

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidDefaultKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

export type invalidDefaultKeyKindMessage = typeof invalidDefaultKeyKindMessage
