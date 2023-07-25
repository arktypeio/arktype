import type { validateDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"

type parsedKey<result extends KeyParseResult> = result

type OptionalTuple<value> = readonly [value, "?"]

type KeyParseResult = {
	kind: ParsedKeyKind
	innerKey: PropertyKey
}
type ParsedKeyKind = "required" | "optional" | "indexed"

type parsedEntry<result extends EntryParseResult> = result

export type OptionalValue<value> =
	| OptionalStringDefinition<value & string>
	| OptionalTuple<value>

export type EntryParseResult = { innerValue: unknown } & KeyParseResult

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

const getInnerDataAndOptional = (
	data: PropertyKey
): { inner: PropertyKey; optional: boolean } =>
	typeof data === "string" && data[data.length - 2] === Scanner.escapeToken
		? { inner: `${data.slice(0, -2)}?`, optional: false }
		: typeof data === "string"
		? { inner: data.slice(0, -1), optional: true }
		: { inner: data, optional: false }

type Entry = [PropertyKey, unknown]

export const parseEntry = (entry: Entry) => {
	const key = entry[0]
	const value = entry[1]
	const keyData = getInnerDataAndOptional(key)
	const data: EntryParseResult = {
		innerKey: keyData.inner,
		innerValue: value,
		kind: "required"
	}

	if (Array.isArray(value)) {
		if (value.length === 2 && value[1] === "?") {
			data["innerValue"] = value[0]
			data["optional"] = "optional"
		}
	} else if (typeof value === "string" && value[value.length - 1] === "?") {
		const valueDefData = getInnerDataAndOptional(key)
		data["innerValue"] = valueDefData.inner
		data["optional"] ||= valueDefData["optional"]
	}
	return data
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
