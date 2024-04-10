import {
	type Node,
	type Schema,
	keywordNodes,
	type writeInvalidPropertyKeyMessage
} from "@arktype/schema"
import {
	type Dict,
	type ErrorMessage,
	type Key,
	type evaluate,
	type merge,
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError
} from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { Type } from "../type.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { astToString } from "./semantic/utils.js"
import type { validateString } from "./semantic/validate.js"
import { Scanner } from "./string/shift/scanner.js"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext): Type => {
	const propNodes: Node<"prop">[] = []
	const indexNodes: Node<"index">[] = []
	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.
	const parsedEntries = stringAndSymbolicEntriesOf(def).map(parseEntry)
	if (parsedEntries[0]?.kind === "spread") {
		// remove the spread entry so we can iterate over the remaining entries
		// expecting non-spread entries
		const spreadEntry = parsedEntries.shift()!
		const spreadNode = ctx.$.parse(spreadEntry.value, ctx)
		if (
			!spreadNode.hasKind("intersection") ||
			!spreadNode.extends(keywordNodes.object)
		) {
			return throwParseError(
				writeInvalidSpreadTypeMessage(printable(spreadEntry.value))
			)
		}
		// TODO: move to props group merge in schema
		// For each key on spreadNode, add it to our object.
		// We filter out keys from the spreadNode that will be defined later on this same object
		// because the currently parsed definition will overwrite them.
		spreadNode.prop?.forEach(
			(spreadRequired) =>
				!parsedEntries.some(
					({ inner: innerKey }) => innerKey === spreadRequired.key
				) && propNodes.push(spreadRequired)
		)
	}
	for (const entry of parsedEntries) {
		if (entry.kind === "spread") {
			return throwParseError(nonLeadingSpreadError)
		}

		if (entry.kind === "index") {
			// handle key parsing first to match type behavior
			const key = ctx.$.parse(entry.inner, ctx)
			const value = ctx.$.parse(entry.value, ctx)
			const indexNode = ctx.$.node("index", { key, value })
			indexNodes.push(indexNode)
		} else {
			const value = ctx.$.parse(entry.value, ctx)
			const propNode = ctx.$.node("prop", {
				key: entry.inner,
				value,
				optional: entry.kind === "optional"
			})
			propNodes.push(propNode)
		}
	}
	return ctx.$.schema({
		domain: "object",
		prop: propNodes,
		index: indexNodes
	})
}

export const nonLeadingSpreadError =
	"Spread operator may only be used as the first key in an object"

/**
 * Infers the contents of an object literal, ignoring a spread definition
 * You probably want to use {@link inferObjectLiteral} instead.
 */
type inferObjectLiteralInner<def extends object, $> = {
	// since def is a const parameter, we remove the readonly modifier here
	// support for builtin readonly tracked here:
	// https://github.com/arktypeio/arktype/issues/808
	-readonly [k in keyof def as nonOptionalKeyFrom<k, $>]: inferDefinition<
		def[k],
		$
	>
} & {
	-readonly [k in keyof def as optionalKeyFrom<k>]?: inferDefinition<
		def[k],
		$
	>
}

export type inferObjectLiteral<def extends object, $> = evaluate<
	"..." extends keyof def
		? merge<inferDefinition<def["..."], $>, inferObjectLiteralInner<def, $>>
		: inferObjectLiteralInner<def, $>
>

export type validateObjectLiteral<def, $> = {
	[k in keyof def]: k extends IndexKey<infer indexDef>
		? validateString<indexDef, $> extends ErrorMessage<infer message>
			? // add a nominal type here to avoid allowing the error message as input
				indexParseError<message>
			: inferDefinition<indexDef, $> extends PropertyKey
				? // if the indexDef is syntactically and semantically valid,
					// move on to the validating the value definition
					validateDefinition<def[k], $>
				: indexParseError<writeInvalidPropertyKeyMessage<indexDef>>
		: k extends "..."
			? inferDefinition<def[k], $> extends object
				? validateDefinition<def[k], $>
				: indexParseError<
						writeInvalidSpreadTypeMessage<astToString<def[k]>>
					>
			: validateDefinition<def[k], $>
}

type nonOptionalKeyFrom<k, $> = parseKey<k> extends PreparsedKey<
	"required",
	infer inner
>
	? inner
	: parseKey<k> extends PreparsedKey<"index", infer inner>
		? inferDefinition<inner, $> & Key
		: // spread key is handled at the type root so is handled neither here nor in optionalKeyFrom
			never

type optionalKeyFrom<k> = parseKey<k> extends PreparsedKey<
	"optional",
	infer inner
>
	? inner
	: never

type PreparsedKey<
	kind extends ParsedKeyKind = ParsedKeyKind,
	inner extends Key = Key
> = {
	kind: kind
	inner: inner
}

namespace PreparsedKey {
	export type from<t extends PreparsedKey> = t
}

type ParsedKeyKind = "required" | "optional" | "index" | "spread"

export type IndexKey<def extends string = string> = `[${def}]`

type PreparsedEntry = PreparsedKey & { value: unknown }

export const parseEntry = (entry: readonly [Key, unknown]): PreparsedEntry =>
	Object.assign(parseKey(entry[0]), { value: entry[1] })

const parseKey = (key: Key): PreparsedKey =>
	typeof key === "symbol"
		? { inner: key, kind: "required" }
		: key.at(-1) === "?"
			? key.at(-2) === Scanner.escapeToken
				? { inner: `${key.slice(0, -2)}?`, kind: "required" }
				: {
						inner: key.slice(0, -1),
						kind: "optional"
					}
			: key[0] === "[" && key.at(-1) === "]"
				? { inner: key.slice(1, -1), kind: "index" }
				: key === "..."
					? { inner: "...", kind: "spread" }
					: { inner: key === "\\..." ? "..." : key, kind: "required" }

type parseKey<k> = k extends `${infer inner}?`
	? inner extends `${infer baseName}${Scanner.EscapeToken}`
		? PreparsedKey.from<{
				kind: "required"
				inner: `${baseName}?`
			}>
		: PreparsedKey.from<{
				kind: "optional"
				inner: inner
			}>
	: k extends "..."
		? PreparsedKey.from<{ kind: "spread"; inner: "..." }>
		: k extends `${Scanner.EscapeToken}...`
			? PreparsedKey.from<{ kind: "required"; inner: "..." }>
			: k extends IndexKey<infer def>
				? PreparsedKey.from<{
						kind: "index"
						inner: def
					}>
				: PreparsedKey.from<{
						kind: "required"
						inner: k extends `${Scanner.EscapeToken}${infer escapedIndexKey extends
							IndexKey}`
							? escapedIndexKey
							: k extends Key
								? k
								: `${k & number}`
					}>

declare const indexParseSymbol: unique symbol

export type indexParseError<message extends string = string> = {
	[indexParseSymbol]: message
}

export const writeInvalidSpreadTypeMessage = <def extends string>(
	def: def
): writeInvalidSpreadTypeMessage<def> =>
	`Spread operand must resolve to an object literal type (was ${def})`

type writeInvalidSpreadTypeMessage<def extends string> =
	`Spread operand must resolve to an object literal type (was ${def})`
