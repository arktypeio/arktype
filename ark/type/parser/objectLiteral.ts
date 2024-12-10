import {
	normalizeIndex,
	type BaseParseContext,
	type BaseRoot,
	type NodeSchema,
	type Structure,
	type writeInvalidPropertyKeyMessage
} from "@ark/schema"
import {
	append,
	escapeChar,
	isEmptyObject,
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError,
	type anyOrNever,
	type Dict,
	type ErrorMessage,
	type ErrorType,
	type EscapeChar,
	type Key,
	type merge,
	type mutable,
	type show
} from "@ark/util"
import type { validateString } from "./ast/validate.ts"
import type { inferDefinition } from "./definition.ts"
import {
	invalidDefaultableKeyKindMessage,
	invalidOptionalKeyKindMessage,
	parseProperty,
	type OptionalPropertyDefinition,
	type validateProperty
} from "./property.ts"

type MutableStructureSchema = mutable<NodeSchema<"structure">, 2>

export const parseObjectLiteral = (
	def: Dict,
	ctx: BaseParseContext
): BaseRoot => {
	let spread: Structure.Node | undefined
	const structure: MutableStructureSchema = {}
	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.
	const defEntries = stringAndSymbolicEntriesOf(def)

	for (const [k, v] of defEntries) {
		const parsedKey = preparseKey(k)

		if (parsedKey.kind === "spread") {
			if (!isEmptyObject(structure))
				return throwParseError(nonLeadingSpreadError)
			const operand = ctx.$.parseOwnDefinitionFormat(v, ctx)
			if (!operand.hasKind("intersection") || !operand.structure) {
				return throwParseError(
					writeInvalidSpreadTypeMessage(operand.expression)
				)
			}
			spread = operand.structure
			continue
		}

		if (parsedKey.kind === "undeclared") {
			if (v !== "reject" && v !== "delete" && v !== "ignore")
				throwParseError(writeInvalidUndeclaredBehaviorMessage(v))
			structure.undeclared = v
			continue
		}

		const parsedValue = parseProperty(v, ctx)
		const parsedEntryKey = parsedKey as PreparsedEntryKey

		if (parsedValue.kind === "optional") {
			if (parsedKey.kind !== "required")
				throwParseError(invalidOptionalKeyKindMessage)

			structure.optional = append(
				structure.optional,
				ctx.$.node("optional", {
					key: parsedKey.normalized,
					value: parsedValue.valueNode
				})
			)
		} else if (parsedValue.kind === "defaultable") {
			if (parsedKey.kind !== "required")
				throwParseError(invalidDefaultableKeyKindMessage)

			structure.optional = append(
				structure.optional,
				ctx.$.node("optional", {
					key: parsedKey.normalized,
					value: parsedValue.valueNode,
					default: parsedValue.default
				})
			)
		} else {
			const signature = ctx.$.parseOwnDefinitionFormat(
				parsedEntryKey.normalized,
				ctx
			)
			const normalized = normalizeIndex(signature, parsedValue.valueNode, ctx.$)

			if (normalized.index)
				structure.index = append(structure.index, normalized.index)

			if (normalized.required)
				structure.required = append(structure.required, normalized.required)
		}
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
	-readonly [k in keyof def as nonOptionalKeyFromEntry<
		k,
		def[k],
		$,
		args
	>]: inferDefinition<def[k], $, args>
} & {
	-readonly [k in keyof def as optionalKeyFromEntry<
		k,
		def[k]
	>]?: def[k] extends OptionalPropertyDefinition<infer baseDef> ?
		inferDefinition<baseDef, $, args>
	:	inferDefinition<def[k], $, args>
}

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: preparseKey<k> extends (
		infer parsedKey extends PreparsedKey
	) ?
		parsedKey extends PreparsedEntryKey<"index"> ?
			validateString<parsedKey["normalized"], $, args> extends (
				ErrorMessage<infer message>
			) ?
				// add a nominal type here to avoid allowing the error message as input
				ErrorType<message>
			: inferDefinition<parsedKey["normalized"], $, args> extends Key ?
				// if the index def is syntactically and semantically valid,
				// move on to the validating the value definition
				validateProperty<def[k], parsedKey["kind"], $, args>
			:	ErrorMessage<writeInvalidPropertyKeyMessage<parsedKey["normalized"]>>
		:	validateProperty<def[k], parsedKey["kind"], $, args>
	:	never
}

type nonOptionalKeyFromEntry<k extends PropertyKey, v, $, args> =
	preparseKey<k> extends (
		infer parsedKey extends PreparsedEntryKey<"required" | "index">
	) ?
		parsedKey["kind"] extends "index" ?
			inferDefinition<parsedKey["normalized"], $, args> & Key
		: [v] extends [OptionalPropertyDefinition] ?
			[v] extends [anyOrNever] ?
				parsedKey["normalized"]
			:	never
		:	parsedKey["normalized"]
	:	// "..." is handled at the type root so is handled neither here nor in optionalKeyFrom
		// "+" has no effect on inference
		never

type optionalKeyFromEntry<k extends PropertyKey, v> =
	preparseKey<k> extends PreparsedEntryKey<"optional", infer name> ? name
	: v extends OptionalPropertyDefinition ? k
	: never

export const writeInvalidUndeclaredBehaviorMessage = (
	actual: unknown
): string =>
	`Value of '+' key must be 'reject', 'delete', or 'ignore' (was ${printable(actual)})`

export const nonLeadingSpreadError =
	"Spread operator may only be used as the first key in an object"

export type PreparsedKey = PreparsedEntryKey | PreparsedSpecialKey

type normalizedKeyKind<kind extends EntryKeyKind> =
	kind extends "index" ? string : Key

export type PreparsedEntryKey<
	kind extends EntryKeyKind = EntryKeyKind,
	normalized extends normalizedKeyKind<kind> = normalizedKeyKind<kind>
> = {
	kind: kind
	normalized: normalized
}

export type PreparsedSpecialKey<kind extends SpecialKeyKind = SpecialKeyKind> =
	{
		kind: kind
	}

declare namespace PreparsedKey {
	export type from<t extends PreparsedKey> = t
}

export type ParsedKeyKind = EntryKeyKind | SpecialKeyKind

export type EntryKeyKind = "required" | "optional" | "index"

export type SpecialKeyKind = "spread" | "undeclared"

export type MetaKey = "..." | "+"

export type IndexKey<def extends string = string> = `[${def}]`

export const preparseKey = (key: Key): PreparsedKey =>
	typeof key === "symbol" ? { kind: "required", normalized: key }
	: key.at(-1) === "?" ?
		key.at(-2) === escapeChar ?
			{ kind: "required", normalized: `${key.slice(0, -2)}?` }
		:	{
				kind: "optional",
				normalized: key.slice(0, -1)
			}
	: key[0] === "[" && key.at(-1) === "]" ?
		{ kind: "index", normalized: key.slice(1, -1) }
	: key[0] === escapeChar && key[1] === "[" && key.at(-1) === "]" ?
		{ kind: "required", normalized: key.slice(1) }
	: key === "..." ? { kind: "spread" }
	: key === "+" ? { kind: "undeclared" }
	: {
			kind: "required",
			normalized:
				key === "\\..." ? "..."
				: key === "\\+" ? "+"
				: key
		}

export type preparseKey<k> =
	k extends symbol ?
		PreparsedKey.from<{
			kind: "required"
			normalized: k
		}>
	: k extends `${infer inner}?` ?
		inner extends `${infer baseName}${EscapeChar}` ?
			PreparsedKey.from<{
				kind: "required"
				normalized: `${baseName}?`
			}>
		:	PreparsedKey.from<{
				kind: "optional"
				normalized: inner
			}>
	: k extends "+" ? { kind: "undeclared" }
	: k extends "..." ? { kind: "spread" }
	: k extends `${EscapeChar}${infer escapedMeta extends MetaKey}` ?
		PreparsedKey.from<{ kind: "required"; normalized: escapedMeta }>
	: k extends IndexKey<infer def> ?
		PreparsedKey.from<{
			kind: "index"
			normalized: def
		}>
	:	PreparsedKey.from<{
			kind: "required"
			normalized: k extends (
				`${EscapeChar}${infer escapedIndexKey extends IndexKey}`
			) ?
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
