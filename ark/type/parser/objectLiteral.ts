import {
	ArkErrors,
	normalizeIndex,
	writeUnassignableDefaultValueMessage,
	type BaseParseContext,
	type BaseRoot,
	type Index,
	type NodeSchema,
	type Optional,
	type Required,
	type Structure,
	type UndeclaredKeyBehavior,
	type unwrapDefault,
	type writeInvalidPropertyKeyMessage
} from "@ark/schema"
import {
	append,
	escapeChar,
	isArray,
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError,
	type anyOrNever,
	type Dict,
	type ErrorMessage,
	type ErrorType,
	type EscapeChar,
	type Key,
	type listable,
	type merge,
	type mutable,
	type show
} from "@ark/util"
import type { withDefault } from "../attributes.ts"
import type { astToString } from "./ast/utils.ts"
import type { validateString } from "./ast/validate.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import type {
	DefaultValueTuple,
	OptionalValueTuple,
	validateEntry
} from "./value.ts"

export const parseObjectLiteral = (
	def: Dict,
	ctx: BaseParseContext
): BaseRoot => {
	let spread: Structure.Node | undefined
	const structure: mutable<NodeSchema<"structure">, 2> = {}
	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.
	const parsedEntries = stringAndSymbolicEntriesOf(def).flatMap(entry =>
		parseEntry(entry[0], entry[1], ctx)
	)
	if (parsedEntries[0]?.kind === "spread") {
		// remove the spread entry so we can iterate over the remaining entries
		// expecting non-spread entries
		const spreadEntry = parsedEntries.shift()! as ParsedSpreadEntry
		if (
			!spreadEntry.node.hasKind("intersection") ||
			!spreadEntry.node.structure
		) {
			return throwParseError(
				writeInvalidSpreadTypeMessage(typeof spreadEntry.node.expression)
			)
		}
		spread = spreadEntry.node.structure
	}
	for (const entry of parsedEntries) {
		if (entry.kind === "spread") return throwParseError(nonLeadingSpreadError)
		if (entry.kind === "undeclared") {
			structure.undeclared = entry.behavior
			continue
		}
		structure[entry.kind] = append(structure[entry.kind], entry) as never
	}

	const structureNode = ctx.$.node("structure", structure)

	return ctx.$.parseSchema({
		domain: "object",
		structure: spread?.merge(structureNode) ?? structureNode
	})
}

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
	-readonly [k in keyof def as nonOptionalKeyFromEntry<k, def[k], $, args>]: [
		def[k]
	] extends [anyOrNever] ?
		def[k]
	: def[k] extends DefaultValueTuple<infer baseDef, infer thunkableValue> ?
		withDefault<
			inferDefinition<baseDef, $, args>,
			unwrapDefault<thunkableValue>
		>
	:	inferDefinition<def[k], $, args>
} & {
	-readonly [k in keyof def as optionalKeyFromEntry<
		k,
		def[k]
	>]?: def[k] extends OptionalValueTuple<infer baseDef> ?
		inferDefinition<baseDef, $, args>
	:	inferDefinition<def[k], $, args>
}

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: k extends IndexKey<infer indexDef> ?
		validateString<indexDef, $, args> extends ErrorMessage<infer message> ?
			// add a nominal type here to avoid allowing the error message as input
			ErrorType<message>
		: inferDefinition<indexDef, $, args> extends Key ?
			// if the indexDef is syntactically and semantically valid,
			// move on to the validating the value definition
			validateDefinition<def[k], $, args>
		:	ErrorType<writeInvalidPropertyKeyMessage<indexDef>>
	:	validateEntry<def[k], parseKey<k>["kind"], $, args>
}

type nonOptionalKeyFromEntry<k, v, $, args> =
	parseKey<k> extends PreparsedKey<"required", infer inner> ?
		v extends OptionalValueTuple ?
			never
		:	inner
	: parseKey<k> extends PreparsedKey<"index", infer inner> ?
		inferDefinition<inner, $, args> extends infer t extends Key ?
			t
		:	never
	:	// "..." is handled at the type root so is handled neither here nor in optionalKeyFrom
		// "+" has no effect on inference
		never

type optionalKeyFromEntry<key extends PropertyKey, v> =
	parseKey<key> extends PreparsedKey<"optional", infer name> ? name
	: v extends OptionalValueTuple ? key
	: never

export const writeInvalidUndeclaredBehaviorMessage = (
	actual: unknown
): string =>
	`Value of '+' key must be 'reject', 'delete', or 'ignore' (was ${printable(actual)})`

export const nonLeadingSpreadError =
	"Spread operator may only be used as the first key in an object"

export type PreparsedKey<
	kind extends PreparsedKeyKind = PreparsedKeyKind,
	key extends Key = Key
> = {
	kind: kind
	key: key
}

declare namespace PreparsedKey {
	export type from<t extends PreparsedKey> = t
}

export type PreparsedKeyKind = "required" | "optional" | "index" | MetaKey

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

	if (parsedKey.kind === "...") {
		return {
			kind: "spread",
			node: ctx.$.parseOwnDefinitionFormat(value, ctx)
		}
	}

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

export const writeInvalidSpreadTypeMessage = <def extends string>(
	def: def
): writeInvalidSpreadTypeMessage<def> =>
	`Spread operand must resolve to an object literal type (was ${def})`

export type writeInvalidSpreadTypeMessage<def extends string> =
	`Spread operand must resolve to an object literal type (was ${def})`
