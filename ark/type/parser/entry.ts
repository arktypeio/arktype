import {
	ArkErrors,
	normalizeIndex,
	writeUnassignableDefaultValueMessage,
	type BaseParseContext,
	type BaseRoot,
	type Index,
	type Optional,
	type Required,
	type UndeclaredKeyBehavior
} from "@ark/schema"
import {
	escapeChar,
	isArray,
	printable,
	throwParseError,
	type anyOrNever,
	type conform,
	type ErrorMessage,
	type EscapeChar,
	type Key,
	type listable
} from "@ark/util"
import type { DefaultFor } from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { validateDefinition } from "./definition.ts"

export const writeInvalidUndeclaredBehaviorMessage = (
	actual: unknown
): string =>
	`Value of '+' key must be 'reject', 'delete', or 'ignore' (was ${printable(actual)})`

export const nonLeadingSpreadError =
	"Spread operator may only be used as the first key in an object"

export type validateDefaultableValue<def, k extends keyof def, $, args> =
	[def[k]] extends [anyOrNever] ?
		/** this extra [anyOrNever] check is required to ensure that nested `type` invocations
		 * like the following are not prematurely validated by the outer call:
		 *
		 * ```ts
		 * type({
		 * 	"test?": type("string").pipe(x => x === "true")
		 * })
		 * ```
		 */
		def[k]
	: def[k] extends DefaultValueTuple ?
		validateDefaultValueTuple<def[k], k, $, args>
	: def[k] extends OptionalValueTuple ?
		readonly [validateDefinition<def[k][0], $, args>, "?"]
	:	validateDefinition<def[k], $, args>

type validateDefaultValueTuple<
	def extends DefaultValueTuple,
	k extends PropertyKey,
	$,
	args
> =
	parseKey<k>["kind"] extends "required" ?
		conform<
			def,
			readonly [
				validateDefinition<def[0], $, args>,
				"=",
				DefaultFor<type.infer.In<def[0], $, args>>
			]
		>
	:	ErrorMessage<invalidDefaultKeyKindMessage>

export type PreparsedKey<
	kind extends ParsedKeyKind = ParsedKeyKind,
	key extends Key = Key
> = {
	kind: kind
	key: key
}

declare namespace PreparsedKey {
	export type from<t extends PreparsedKey> = t
}

type ParsedKeyKind = "required" | "optional" | "index" | MetaKey

export type MetaKey = "..." | "+"

export type IndexKey<def extends string = string> = `[${def}]`

export type ParsedEntry =
	| ParsedUndeclaredEntry
	| ParsedSpreadEntry
	| Required.Node
	| Optional.Node
	| Index.Node

export type ParsedUndeclaredEntry = {
	kind: "undeclared"
	behavior: UndeclaredKeyBehavior
}

export type ParsedSpreadEntry = {
	kind: "spread"
	node: BaseRoot
}

export type DefaultValueTuple<
	baseDef = unknown,
	thunkableValue = unknown
> = readonly [baseDef, "=", thunkableValue]

export type OptionalValueTuple<baseDef = unknown> = readonly [baseDef, "?"]

export const parseEntry = (
	key: Key,
	value: unknown,
	ctx: BaseParseContext
): listable<ParsedEntry> => {
	const parsedKey = parseKey(key)

	if (parsedKey.kind === "+") {
		if (value !== "reject" && value !== "delete" && value !== "ignore")
			throwParseError(writeInvalidUndeclaredBehaviorMessage(value))
		return { kind: "undeclared", behavior: value }
	}

	if (parsedKey.kind === "...")
		return { kind: "spread", node: ctx.$.parseOwnDefinitionFormat(value, ctx) }

	if (isArray(value) && (value[1] === "=" || value[1] === "?")) {
		if (parsedKey.kind !== "required")
			throwParseError(invalidDefaultKeyKindMessage)

		const parsedValue = ctx.$.parseOwnDefinitionFormat(value[0], ctx)

		if (value[1] === "?") {
			return ctx.$.node("optional", {
				key: parsedKey.key,
				value: parsedValue
			})
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

		return ctx.$.node("optional", {
			key: parsedKey.key,
			value: parsedValue,
			default: value[2]
		})
	}

	const parsedValue = ctx.$.parseOwnDefinitionFormat(value, ctx)

	if (parsedKey.kind === "index") {
		const signature = ctx.$.parseOwnDefinitionFormat(parsedKey.key, ctx)
		const normalized = normalizeIndex(signature, parsedValue, ctx.$)
		return (
			normalized.index ?
				normalized.required ?
					[normalized.index, ...normalized.required]
				:	normalized.index
			:	(normalized.required ?? [])
		)
	}

	return ctx.$.node(parsedKey.kind, {
		key: parsedKey.key,
		value: parsedValue
	})
}

export const parseKey = (key: Key): PreparsedKey =>
	typeof key === "symbol" ? { kind: "required", key }
	: key.at(-1) === "?" ?
		key.at(-2) === escapeChar ?
			{ kind: "required", key: `${key.slice(0, -2)}?` }
		:	{
				kind: "optional",
				key: key.slice(0, -1)
			}
	: key[0] === "[" && key.at(-1) === "]" ?
		{ kind: "index", key: key.slice(1, -1) }
	: key[0] === escapeChar && key[1] === "[" && key.at(-1) === "]" ?
		{ kind: "required", key: key.slice(1) }
	: key === "..." ? { kind: key, key }
	: key === "+" ? { kind: key, key }
	: {
			kind: "required",
			key:
				key === "\\..." ? "..."
				: key === "\\+" ? "+"
				: key
		}

export type parseKey<k> =
	k extends `${infer inner}?` ?
		inner extends `${infer baseName}${EscapeChar}` ?
			PreparsedKey.from<{
				kind: "required"
				key: `${baseName}?`
			}>
		:	PreparsedKey.from<{
				kind: "optional"
				key: inner
			}>
	: k extends MetaKey ? PreparsedKey.from<{ kind: k; key: k }>
	: k extends `${EscapeChar}${infer escapedMeta extends MetaKey}` ?
		PreparsedKey.from<{ kind: "required"; key: escapedMeta }>
	: k extends IndexKey<infer def> ?
		PreparsedKey.from<{
			kind: "index"
			key: def
		}>
	:	PreparsedKey.from<{
			kind: "required"
			key: k extends `${EscapeChar}${infer escapedIndexKey extends IndexKey}` ?
				escapedIndexKey
			: k extends Key ? k
			: `${k & number}`
		}>

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidOptionalKeyKindMessage = `Only required keys may specify optional values, e.g. { [mySymbol]: ['number', '?'] }`

export type invalidOptionalKeyKindMessage = typeof invalidOptionalKeyKindMessage

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidDefaultKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

export type invalidDefaultKeyKindMessage = typeof invalidDefaultKeyKindMessage

export const writeInvalidSpreadTypeMessage = <def extends string>(
	def: def
): writeInvalidSpreadTypeMessage<def> =>
	`Spread operand must resolve to an object literal type (was ${def})`

export type writeInvalidSpreadTypeMessage<def extends string> =
	`Spread operand must resolve to an object literal type (was ${def})`
