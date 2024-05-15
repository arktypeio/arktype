import type {
	BaseRoot,
	NodeSchema,
	StructureNode,
	UndeclaredKeyBehavior,
	UnitNode,
	writeInvalidPropertyKeyMessage
} from "@arktype/schema"
import {
	append,
	printable,
	spliterate,
	stringAndSymbolicEntriesOf,
	throwParseError,
	type Dict,
	type ErrorMessage,
	type Key,
	type keyError,
	type merge,
	type mutable,
	type show
} from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { astToString } from "./semantic/utils.js"
import type { validateString } from "./semantic/validate.js"
import { Scanner } from "./string/shift/scanner.js"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext): BaseRoot => {
	let spread: StructureNode | undefined
	const structure: mutable<NodeSchema<"structure">, 2> = {}
	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.
	const parsedEntries = stringAndSymbolicEntriesOf(def).map(parseEntry)
	if (parsedEntries[0]?.kind === "...") {
		// remove the spread entry so we can iterate over the remaining entries
		// expecting non-spread entries
		const spreadEntry = parsedEntries.shift()!
		const spreadNode = ctx.$.parse(spreadEntry.value, ctx)
		if (!spreadNode.hasKind("intersection") || !spreadNode.structure) {
			return throwParseError(
				writeInvalidSpreadTypeMessage(
					typeof spreadEntry.value === "string" ?
						spreadEntry.value
					:	printable(spreadEntry.value)
				)
			)
		}
		spread = spreadNode.structure
	}
	for (const entry of parsedEntries) {
		if (entry.kind === "...") return throwParseError(nonLeadingSpreadError)
		if (entry.kind === "+") {
			if (
				entry.value !== "reject" &&
				entry.value !== "delete" &&
				entry.value !== "ignore"
			)
				throwParseError(writeInvalidUndeclaredBehaviorMessage(entry.value))
			structure.undeclared = entry.value
			continue
		}
		if (entry.kind === "index") {
			// handle key parsing first to match type behavior
			const key = ctx.$.parse(entry.inner, ctx)
			const value = ctx.$.parse(entry.value, ctx)

			// extract enumerable named props from the index signature
			const [enumerable, nonEnumerable] = spliterate(
				key.branches,
				(k): k is UnitNode => k.hasKind("unit")
			)

			if (enumerable.length) {
				structure.required = append(
					structure.required,
					enumerable.map(k =>
						ctx.$.node("required", { key: k.unit as Key, value })
					)
				)
				if (nonEnumerable.length) {
					structure.index = append(
						structure.index,
						ctx.$.node("index", { index: nonEnumerable, value })
					)
				}
			} else {
				structure.index = append(
					structure.index,
					ctx.$.node("index", { index: key, value })
				)
			}
		} else {
			const value = ctx.$.parse(entry.value, ctx)
			structure[entry.kind] = append(structure[entry.kind], {
				key: entry.inner,
				value
			})
		}
	}

	const structureNode = ctx.$.node("structure", structure)

	return ctx.$.schema({
		domain: "object",
		structure: spread?.merge(structureNode) ?? structureNode
	})
}

export const writeInvalidUndeclaredBehaviorMessage = (
	actual: unknown
): string =>
	`Value of '+' key must be 'reject', 'delete', or 'ignore' (was ${printable(actual)})`

export const nonLeadingSpreadError =
	"Spread operator may only be used as the first key in an object"

export type inferObjectLiteral<def extends object, $, args> = show<
	"..." extends keyof def ?
		merge<
			inferDefinition<def["..."], $, args>,
			_inferObjectLiteral<def, $, args>
		>
	:	_inferObjectLiteral<def, $, args>
>

/**
 * Infers the contents of an object literal, ignoring a spread definition
 */
type _inferObjectLiteral<def extends object, $, args> = {
	// since def is a const parameter, we remove the readonly modifier here
	// support for builtin readonly tracked here:
	// https://github.com/arktypeio/arktype/issues/808
	-readonly [k in keyof def as nonOptionalKeyFrom<k, $, args>]: inferDefinition<
		def[k],
		$,
		args
	>
} & {
	-readonly [k in keyof def as optionalKeyFrom<k>]?: inferDefinition<
		def[k],
		$,
		args
	>
}

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: k extends IndexKey<infer indexDef> ?
		validateString<indexDef, $, args> extends ErrorMessage<infer message> ?
			// add a nominal type here to avoid allowing the error message as input
			keyError<message>
		: inferDefinition<indexDef, $, args> extends PropertyKey ?
			// if the indexDef is syntactically and semantically valid,
			// move on to the validating the value definition
			validateDefinition<def[k], $, args>
		:	keyError<writeInvalidPropertyKeyMessage<indexDef>>
	: k extends "..." ?
		inferDefinition<def[k], $, args> extends object ?
			validateDefinition<def[k], $, args>
		:	keyError<writeInvalidSpreadTypeMessage<astToString<def[k]>>>
	: k extends "+" ? UndeclaredKeyBehavior
	: validateDefinition<def[k], $, args>
}

type nonOptionalKeyFrom<k, $, args> =
	parseKey<k> extends PreparsedKey<"required", infer inner> ? inner
	: parseKey<k> extends PreparsedKey<"index", infer inner> ?
		inferDefinition<inner, $, args> & Key
	:	// "..." is handled at the type root so is handled neither here nor in optionalKeyFrom
		// "+" has no effect on inference
		never

type optionalKeyFrom<k> =
	parseKey<k> extends PreparsedKey<"optional", infer inner> ? inner : never

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

type ParsedKeyKind = "required" | "optional" | "index" | MetaKey

export type MetaKey = "..." | "+"

export type IndexKey<def extends string = string> = `[${def}]`

type PreparsedEntry = PreparsedKey & { value: unknown }

export const parseEntry = (entry: readonly [Key, unknown]): PreparsedEntry =>
	Object.assign(parseKey(entry[0]), { value: entry[1] })

const parseKey = (key: Key): PreparsedKey =>
	typeof key === "symbol" ? { inner: key, kind: "required" }
	: key.at(-1) === "?" ?
		key.at(-2) === Scanner.escapeToken ?
			{ inner: `${key.slice(0, -2)}?`, kind: "required" }
		:	{
				inner: key.slice(0, -1),
				kind: "optional"
			}
	: key[0] === "[" && key.at(-1) === "]" ?
		{ inner: key.slice(1, -1), kind: "index" }
	: key[0] === Scanner.escapeToken && key[1] === "[" && key.at(-1) === "]" ?
		{ inner: key.slice(1), kind: "required" }
	: key === "..." || key === "+" ? { inner: key, kind: key }
	: {
			inner:
				key === "\\..." ? "..."
				: key === "\\+" ? "+"
				: key,
			kind: "required"
		}

type parseKey<k> =
	k extends `${infer inner}?` ?
		inner extends `${infer baseName}${Scanner.EscapeToken}` ?
			PreparsedKey.from<{
				kind: "required"
				inner: `${baseName}?`
			}>
		:	PreparsedKey.from<{
				kind: "optional"
				inner: inner
			}>
	: k extends MetaKey ? PreparsedKey.from<{ kind: k; inner: k }>
	: k extends `${Scanner.EscapeToken}${infer escapedMeta extends MetaKey}` ?
		PreparsedKey.from<{ kind: "required"; inner: escapedMeta }>
	: k extends IndexKey<infer def> ?
		PreparsedKey.from<{
			kind: "index"
			inner: def
		}>
	:	PreparsedKey.from<{
			kind: "required"
			inner: k extends (
				`${Scanner.EscapeToken}${infer escapedIndexKey extends IndexKey}`
			) ?
				escapedIndexKey
			: k extends Key ? k
			: `${k & number}`
		}>

export const writeInvalidSpreadTypeMessage = <def extends string>(
	def: def
): writeInvalidSpreadTypeMessage<def> =>
	`Spread operand must resolve to an object literal type (was ${def})`

type writeInvalidSpreadTypeMessage<def extends string> =
	`Spread operand must resolve to an object literal type (was ${def})`
