import {
	ArkErrors,
	normalizeIndex,
	type BaseRoot,
	type DateLiteral,
	type Default,
	type distillOut,
	type MutableInner,
	type NodeSchema,
	type of,
	type PropKind,
	type StructureNode,
	type UndeclaredKeyBehavior,
	type writeInvalidPropertyKeyMessage
} from "@arktype/schema"
import {
	anchoredRegex,
	append,
	deanchoredSource,
	integerLikeMatcher,
	isArray,
	keysOf,
	numberLikeMatcher,
	printable,
	stringAndSymbolicEntriesOf,
	throwInternalError,
	throwParseError,
	tryParseWellFormedBigint,
	tryParseWellFormedNumber,
	unset,
	type anyOrNever,
	type BigintLiteral,
	type Dict,
	type ErrorMessage,
	type Key,
	type keyError,
	type merge,
	type mutable,
	type NumberLiteral,
	type show
} from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { astToString } from "./semantic/utils.js"
import type { validateString } from "./semantic/validate.js"
import type { StringLiteral } from "./string/shift/operand/enclosed.js"
import { Scanner } from "./string/shift/scanner.js"
import type { inferString } from "./string/string.js"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext): BaseRoot => {
	let spread: StructureNode | undefined
	const structure: mutable<NodeSchema<"structure">, 2> = {}
	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.
	const parsedEntries = stringAndSymbolicEntriesOf(def).map(entry =>
		parseEntry(entry[0], entry[1])
	)
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
			const key = ctx.$.parse(entry.key, ctx)
			const value = ctx.$.parse(entry.value, ctx)

			const normalizedSignature = normalizeIndex(key, value, ctx.$)
			if (normalizedSignature.required) {
				structure.required = append(
					structure.required,
					normalizedSignature.required
				)
			}
			if (normalizedSignature.index)
				structure.index = append(structure.index, normalizedSignature.index)
		} else {
			const value = ctx.$.parse(entry.value, ctx)
			const inner: MutableInner<PropKind> = { key: entry.key, value }
			if (entry.default !== unset) {
				const out = value.traverse(entry.default)
				if (out instanceof ArkErrors)
					throwParseError(`Default value at ${printable(entry.key)} ${out}`)

				value.assert(entry.default)
				;(inner as MutableInner<"optional">).default = entry.default
			}

			structure[entry.kind] = append(structure[entry.kind], inner)
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
	-readonly [k in keyof def as nonOptionalKeyFrom<k, $, args>]: def[k] extends (
		DefaultValueTuple<infer baseDef, infer defaultValue>
	) ?
		def[k] extends anyOrNever ?
			def[k]
		:	(In?: inferDefinition<baseDef, $, args>) => Default<defaultValue>
	: def[k] extends DefaultValueString<infer baseDef, infer defaultDef> ?
		(
			In?: inferDefinition<baseDef, $, args>
		) => Default<inferDefinition<defaultDef, $, args>>
	:	inferDefinition<def[k], $, args>
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
		: inferDefinition<indexDef, $, args> extends (
			PropertyKey | of<PropertyKey, {}>
		) ?
			// if the indexDef is syntactically and semantically valid,
			// move on to the validating the value definition
			validateDefinition<def[k], $, args>
		:	keyError<writeInvalidPropertyKeyMessage<indexDef>>
	: k extends "..." ?
		inferDefinition<def[k], $, args> extends object ?
			validateDefinition<def[k], $, args>
		:	keyError<writeInvalidSpreadTypeMessage<astToString<def[k]>>>
	: k extends "+" ? UndeclaredKeyBehavior
	: validateDefaultableValue<def, k, $, args>
}

type validateDefaultableValue<def, k extends keyof def, $, args> =
	def[k] extends DefaultValueTuple ?
		validateDefaultValueTuple<def[k], k, $, args>
	: def[k] extends DefaultValueString ?
		validateDefaultValueString<def[k], k, $, args>
	:	validateDefinition<def[k], $, args>

type DefaultValueTuple<baseDef = unknown, defaultValue = unknown> = readonly [
	baseDef,
	"=",
	defaultValue
]

type validateDefaultValueTuple<
	def extends DefaultValueTuple,
	k extends PropertyKey,
	$,
	args
> =
	parseKey<k>["kind"] extends "required" ?
		readonly [
			validateDefinition<def[0], $, args>,
			"=",
			inferDefinition<def[0], $, args>
		]
	:	ErrorMessage<invalidDefaultKeyKindMessage>

type DefaultValueString<
	baseDef extends string = string,
	defaultDef extends UnitLiteral = UnitLiteral
> = `${baseDef}${typeof defaultValueStringOperator}${defaultDef}`

const defaultValueStringOperator = " = "

type validateDefaultValueString<
	def extends DefaultValueString,
	k extends PropertyKey,
	$,
	args
> =
	def extends DefaultValueString<infer baseDef, infer defaultDef> ?
		parseKey<k>["kind"] extends "required" ?
			validateDefinition<baseDef, $, args> extends (
				infer e extends ErrorMessage
			) ?
				e
			: [
				// check against the output of the type since morphs will not occur
				// we currently can't parse string embedded defaults for non-global keywords
				distillOut<inferString<baseDef, {}, args>>,
				// a default value should never have In/Out, so which side we choose is irrelevant
				// we will never need a scope here as we're just trying to infer a UnitLiteral
				distillOut<inferString<defaultDef, {}, args>>
			] extends [infer base, infer defaultValue] ?
				defaultValue extends base ?
					def
				:	ErrorMessage<`${defaultDef} is not assignable to ${baseDef}`>
			:	never
		:	ErrorMessage<invalidDefaultKeyKindMessage>
	:	never

type nonOptionalKeyFrom<k, $, args> =
	parseKey<k> extends PreparsedKey<"required", infer inner> ? inner
	: parseKey<k> extends PreparsedKey<"index", infer inner> ?
		Extract<inferDefinition<inner, $, args>, Key>
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
	key: inner
}

namespace PreparsedKey {
	export type from<t extends PreparsedKey> = t
}

type ParsedKeyKind = "required" | "optional" | "index" | MetaKey

export type MetaKey = "..." | "+"

export type IndexKey<def extends string = string> = `[${def}]`

interface PreparsedEntry extends PreparsedKey {
	value: unknown
	default: unknown
}

const unitLiteralKeywords = {
	null: null,
	undefined,
	true: true,
	false: false
} as const

type UnitLiteralKeyword = keyof typeof unitLiteralKeywords

export type UnitLiteral =
	| StringLiteral
	| BigintLiteral
	| NumberLiteral
	| DateLiteral
	| UnitLiteralKeyword

/** Matches a single or double-quoted date or string literal */
const stringLiteral = anchoredRegex(/(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/)

/** Matches a definition including a valid default value expression */
const defaultExpressionMatcher = new RegExp(
	`^(?<baseDef>[\\s\\S]*) = (` +
		`(?<string>${deanchoredSource(stringLiteral)})` +
		`|(?<date>d${deanchoredSource(stringLiteral)})` +
		`|(?<bigint>${deanchoredSource(integerLikeMatcher)}n)` +
		`|(?<number>${deanchoredSource(numberLikeMatcher)})` +
		`|(?<keyword>${keysOf(unitLiteralKeywords).join("|")})` +
		`)$`
)

type DefaultExpressionMatcherGroups = {
	baseDef: string
	string?: StringLiteral
	date?: DateLiteral
	bigint?: BigintLiteral
	number?: NumberLiteral
	keyword?: UnitLiteralKeyword
}

type UnitLiteralValue =
	| string
	| Date
	| bigint
	| number
	| boolean
	| null
	| undefined

const parsePossibleDefaultExpression = (s: string) => {
	const result = defaultExpressionMatcher.exec(s)
	return result && (result.groups as {} as DefaultExpressionMatcherGroups)
}

export const parseEntry = (key: Key, value: unknown): PreparsedEntry => {
	const parsedKey = parseKey(key)

	if (isArray(value) && value[1] === "=") {
		if (parsedKey.kind !== "required")
			throwParseError(invalidDefaultKeyKindMessage)
		return {
			kind: "optional",
			key: parsedKey.key,
			value: value[0],
			default: value[2]
		}
	}

	// if a string includes " = ", it might have a default value,
	// but it could also be a string literal like "' = '"
	if (typeof value === "string" && value.includes(defaultValueStringOperator)) {
		const result = parsePossibleDefaultExpression(value)
		if (result) return parseDefaultValueStringExpression(parsedKey, result)
	}

	return {
		kind: parsedKey.kind,
		key: parsedKey.key,
		value,
		default: unset
	}
}

const parseDefaultValueStringExpression = (
	parsedKey: PreparsedKey,
	match: DefaultExpressionMatcherGroups
): PreparsedEntry => {
	if (parsedKey.kind !== "required")
		throwParseError(invalidDefaultKeyKindMessage)

	let defaultValue: UnitLiteralValue

	if (match.keyword) defaultValue = unitLiteralKeywords[match.keyword]
	else if (match.string) defaultValue = match.string.slice(1, -1)
	else if (match.number) {
		defaultValue = tryParseWellFormedNumber(match.number, {
			errorOnFail: true
		})
	} else if (match.date) defaultValue = new Date(match.date)
	else if (match.bigint) {
		defaultValue =
			tryParseWellFormedBigint(match.bigint) ??
			throwInternalError(
				`Unexpected default bigint parse result ${match.bigint}`
			)
	} else
		throwInternalError(`Unexpected default expression parse result ${match}`)

	return {
		kind: "optional",
		key: parsedKey.key,
		value: match.baseDef,
		default: defaultValue
	}
}

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidDefaultKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

export type invalidDefaultKeyKindMessage = typeof invalidDefaultKeyKindMessage

const parseKey = (key: Key): PreparsedKey =>
	typeof key === "symbol" ? { kind: "required", key }
	: key.at(-1) === "?" ?
		key.at(-2) === Scanner.escapeToken ?
			{ kind: "required", key: `${key.slice(0, -2)}?` }
		:	{
				kind: "optional",
				key: key.slice(0, -1)
			}
	: key[0] === "[" && key.at(-1) === "]" ?
		{ kind: "index", key: key.slice(1, -1) }
	: key[0] === Scanner.escapeToken && key[1] === "[" && key.at(-1) === "]" ?
		{ kind: "required", key: key.slice(1) }
	: key === "..." || key === "+" ? { kind: key, key }
	: {
			kind: "required",
			key:
				key === "\\..." ? "..."
				: key === "\\+" ? "+"
				: key
		}

type parseKey<k> =
	k extends `${infer inner}?` ?
		inner extends `${infer baseName}${Scanner.EscapeToken}` ?
			PreparsedKey.from<{
				kind: "required"
				key: `${baseName}?`
			}>
		:	PreparsedKey.from<{
				kind: "optional"
				key: inner
			}>
	: k extends MetaKey ? PreparsedKey.from<{ kind: k; key: k }>
	: k extends `${Scanner.EscapeToken}${infer escapedMeta extends MetaKey}` ?
		PreparsedKey.from<{ kind: "required"; key: escapedMeta }>
	: k extends IndexKey<infer def> ?
		PreparsedKey.from<{
			kind: "index"
			key: def
		}>
	:	PreparsedKey.from<{
			kind: "required"
			key: k extends (
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
