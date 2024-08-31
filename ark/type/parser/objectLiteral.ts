import {
	normalizeIndex,
	type BaseRoot,
	type Index,
	type NodeSchema,
	type Optional,
	type Required,
	type Structure,
	type UndeclaredKeyBehavior,
	type writeInvalidPropertyKeyMessage
} from "@ark/schema"
import {
	append,
	escapeToken,
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError,
	type anyOrNever,
	type Dict,
	type ErrorMessage,
	type ErrorType,
	type EscapeToken,
	type Key,
	type listable,
	type merge,
	type mutable,
	type show
} from "@ark/util"
import type { constrain, OptionalAst } from "../keywords/ast.ts"
import type { ParseContext } from "../scope.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import type { astToString } from "./semantic/utils.ts"
import type { validateString } from "./semantic/validate.ts"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext): BaseRoot => {
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

	return ctx.$.rootNode({
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
	-readonly [k in keyof def as nonOptionalKeyFrom<
		k,
		def[k],
		$,
		args
	>]: inferDefinition<def[k], $, args>
} & {
	-readonly [k in keyof def as optionalKeyFrom<
		k,
		def[k],
		$,
		args
	>]?: inferDefinition<def[k], $, args> extends infer t ?
		t extends OptionalAst<infer nonOptionalT> ?
			nonOptionalT
		:	t
	:	never
}

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: k extends IndexKey<infer indexDef> ?
		validateString<indexDef, $, args> extends ErrorMessage<infer message> ?
			// add a nominal type here to avoid allowing the error message as input
			ErrorType<message>
		: inferDefinition<indexDef, $, args> extends Key | constrain<Key, {}> ?
			// if the indexDef is syntactically and semantically valid,
			// move on to the validating the value definition
			validateDefinition<def[k], $, args>
		:	ErrorType<writeInvalidPropertyKeyMessage<indexDef>>
	: k extends "..." ?
		inferDefinition<def[k], $, args> extends object ?
			validateDefinition<def[k], $, args>
		:	ErrorType<writeInvalidSpreadTypeMessage<astToString<def[k]>>>
	: k extends "+" ? UndeclaredKeyBehavior
	: validateDefinition<def[k], $, args>
}

type nonOptionalKeyFrom<k, v, $, args> =
	parseKey<k> extends PreparsedKey<"required", infer parsedKey> ?
		inferDefinition<v, $, args> extends infer t ?
			[t] extends [OptionalAst] ?
				[t] extends [anyOrNever] ?
					parsedKey
				:	never
			:	parsedKey
		:	never
	: parseKey<k> extends PreparsedKey<"index", infer parsedKey> ?
		inferDefinition<parsedKey, $, args> extends infer inferredKey extends Key ?
			inferredKey
		:	never
	:	// "..." is handled at the type root so is handled neither here nor in optionalKeyFrom
		// "+" has no effect on inference
		never

type optionalKeyFrom<k, v, $, args> =
	parseKey<k> extends PreparsedKey<"optional", infer parsedKey> ? parsedKey
	: parseKey<k> extends PreparsedKey<"required", infer parsedKey> ?
		inferDefinition<v, $, args> extends infer t ?
			[t] extends [OptionalAst] ?
				[t] extends [anyOrNever] ?
					never
				:	parsedKey
			:	never
		:	never
	:	never

type PreparsedKey<
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

export const parseEntry = (
	key: Key,
	value: unknown,
	ctx: ParseContext
): listable<ParsedEntry> => {
	const parsedKey = parseKey(key)

	if (parsedKey.kind === "+") {
		if (value !== "reject" && value !== "delete" && value !== "ignore")
			throwParseError(writeInvalidUndeclaredBehaviorMessage(value))
		return { kind: "undeclared", behavior: value }
	}

	if (parsedKey.kind === "...")
		return { kind: "spread", node: ctx.$.parse(value, ctx) }

	const parsedValue = ctx.$.parse(value, ctx)

	if (parsedKey.kind === "index") {
		const signature = ctx.$.parse(parsedKey.key, ctx)
		const normalized = normalizeIndex(signature, parsedValue, ctx.$)
		return (
			normalized.index ?
				normalized.required ?
					[normalized.index, ...normalized.required]
				:	normalized.index
			:	(normalized.required ?? [])
		)
	}

	if ("default" in parsedValue.meta) {
		return ctx.$.node("optional", {
			key: parsedKey.key,
			value: parsedValue,
			default: parsedValue.meta.default
		})
	}

	if (parsedValue.meta.optional) {
		return ctx.$.node("optional", {
			key: parsedKey.key,
			value: parsedValue
		})
	}

	return ctx.$.node(parsedKey.kind, {
		key: parsedKey.key,
		value: parsedValue
	})
}

const parseKey = (key: Key): PreparsedKey =>
	typeof key === "symbol" ? { kind: "required", key }
	: key.at(-1) === "?" ?
		key.at(-2) === escapeToken ?
			{ kind: "required", key: `${key.slice(0, -2)}?` }
		:	{
				kind: "optional",
				key: key.slice(0, -1)
			}
	: key[0] === "[" && key.at(-1) === "]" ?
		{ kind: "index", key: key.slice(1, -1) }
	: key[0] === escapeToken && key[1] === "[" && key.at(-1) === "]" ?
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

type parseKey<k> =
	k extends `${infer inner}?` ?
		inner extends `${infer baseName}${EscapeToken}` ?
			PreparsedKey.from<{
				kind: "required"
				key: `${baseName}?`
			}>
		:	PreparsedKey.from<{
				kind: "optional"
				key: inner
			}>
	: k extends MetaKey ? PreparsedKey.from<{ kind: k; key: k }>
	: k extends `${EscapeToken}${infer escapedMeta extends MetaKey}` ?
		PreparsedKey.from<{ kind: "required"; key: escapedMeta }>
	: k extends IndexKey<infer def> ?
		PreparsedKey.from<{
			kind: "index"
			key: def
		}>
	:	PreparsedKey.from<{
			kind: "required"
			key: k extends `${EscapeToken}${infer escapedIndexKey extends IndexKey}` ?
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
