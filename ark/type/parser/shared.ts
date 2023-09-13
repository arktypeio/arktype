import type { evaluate } from "@arktype/util"
import type { validateDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"

type parsedKey<result extends KeyParseResult> = result

type OptionalTuple<value> = readonly [value, "?"]

type KeyParseResult<kind extends ParsedKeyKind = ParsedKeyKind> = {
	kind: kind
	innerKey: PropertyKey
}
type ParsedKeyKind = "required" | "optional" | "indexed"

type parsedEntry<result extends EntryParseResult> = result

export type OptionalValue<value> =
	| OptionalStringDefinition<value & string>
	| OptionalTuple<value>

export type EntryParseResult<kind extends ParsedKeyKind = ParsedKeyKind> =
	evaluate<{ innerValue: unknown } & KeyParseResult<kind>>

export type OptionalStringDefinition<name extends string = string> = `${name}?`

export type IndexedKey<def extends string = string> = `[${def}]`

export type validateObjectValue<def, $, args> = def extends OptionalTuple<
	infer value
>
	? readonly [validateObjectValueString<value, $, args>, "?"]
	: validateObjectValueString<def, $, args>

type validateObjectValueString<def, $, args> =
	def extends OptionalStringDefinition<infer innerValue>
		? `${validateDefinition<innerValue, $, args>}?`
		: validateDefinition<def, $, args>

type DefinitionEntry = readonly [PropertyKey, unknown]

const getInnerValue = (value: unknown): unknown => {
	if (typeof value === "string") {
		if (value[value.length - 1] === "?") {
			return value.slice(0, -1)
		}
	} else if (Array.isArray(value)) {
		if (value.length === 2 && value[1] === "?") {
			return getInnerValue(value[0])
		}
	}
	return value
}

export const parseEntry = ([key, value]: DefinitionEntry) => {
	const keyParseResult =
		typeof key === "string"
			? key[key.length - 1] === "?" &&
			  key[key.length - 2] === Scanner.escapeToken
				? { innerKey: `${key.slice(0, -2)}?`, kind: "required" }
				: { innerKey: key.slice(0, -1), kind: "optional" }
			: { innerKey: key, kind: "required" }

	return {
		innerKey: keyParseResult.innerKey,
		innerValue: getInnerValue(value),
		kind: keyParseResult.kind
	}
}

export type parseEntry<
	keyDef extends PropertyKey,
	valueDef
> = parseKey<keyDef> extends infer keyParseResult extends KeyParseResult
	? valueDef extends OptionalValue<infer innerValue>
		? parsedEntry<{
				kind: "optional"
				innerKey: keyParseResult["innerKey"]
				innerValue: innerValue extends OptionalStringDefinition<
					infer innerStringValue
				>
					? innerStringValue
					: innerValue
		  }>
		: parsedEntry<{
				kind: keyParseResult["kind"]
				innerKey: keyParseResult["innerKey"]
				innerValue: valueDef
		  }>
	: never

type parseKey<k> = k extends OptionalStringDefinition<infer inner>
	? inner extends `${infer baseName}${Scanner.EscapeToken}`
		? parsedKey<{
				kind: "required"
				innerKey: OptionalStringDefinition<baseName>
		  }>
		: parsedKey<{
				kind: "optional"
				innerKey: inner
		  }>
	: k extends IndexedKey<infer def>
	? parsedKey<{
			kind: "indexed"
			innerKey: def
	  }>
	: k extends `${Scanner.EscapeToken}${infer escapedIndexKey extends
			IndexedKey}`
	? parsedKey<{
			kind: "required"
			innerKey: escapedIndexKey
	  }>
	: parsedKey<{
			kind: "required"
			innerKey: k & (string | symbol)
	  }>
