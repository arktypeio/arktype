import { keywords, schema, type Inner } from "@arktype/schema"
import {
	printable,
	throwParseError,
	type Dict,
	type ErrorMessage,
	type evaluate,
	type merge
} from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { astToString } from "./semantic/utils.js"
import type { validateString } from "./semantic/validate.js"
import {
	parseEntry,
	type EntryParseResult,
	type IndexedKey,
	type OptionalValue,
	type validateObjectValue
} from "./shared.js"

const stringAndSymbolicEntriesOf = (o: Record<string | symbol, unknown>) => [
	...Object.entries(o),
	...Object.getOwnPropertySymbols(o).map((k) => [k, o[k]] as const)
]

export const parseObjectLiteral = (def: Dict, ctx: ParseContext) => {
	const required: Inner<"required">[] = []
	const optional: Inner<"optional">[] = []

	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.
	// Discussion in ArkType Discord:
	// https://discord.com/channels/957797212103016458/1103023445035462678/1182814502471860334
	let hasSeenFirstKey = false

	for (const entry of stringAndSymbolicEntriesOf(def)) {
		const result = parseEntry(entry)

		if (result.kind === "spread") {
			if (hasSeenFirstKey) {
				return throwParseError(
					"Spread operator may only be used as the first key in an object"
				)
			}

			const spreadNode = ctx.scope.parse(result.innerValue, ctx)

			if (
				spreadNode.kind !== "intersection" ||
				!spreadNode.extends(keywords.object)
			) {
				return throwParseError(
					writeInvalidSpreadTypeMessage(printable(result.innerValue))
				)
			}

			// For each key on spreadNode, add it to our object.
			required.push(...(spreadNode.required ?? []))
			optional.push(...(spreadNode.optional ?? []))

			continue
		}

		ctx.path.push(
			`${
				typeof result.innerKey === "symbol"
					? `[${printable(result.innerKey)}]`
					: result.innerKey
			}`
		)
		const valueNode = ctx.scope.parse(result.innerValue, ctx)

		const existingRequired = required.findIndex(
			(e) => e.key === result.innerKey
		)
		const existingOptional = optional.findIndex(
			(e) => e.key === result.innerKey
		)

		if (existingRequired !== -1) required.splice(existingRequired, 1)

		if (existingOptional !== -1) optional.splice(existingOptional, 1)

		if (result.kind === "optional") {
			optional.push({
				key: result.innerKey,
				value: valueNode
			})
		} else {
			required.push({
				key: result.innerKey,
				value: valueNode
			})
		}
		ctx.path.pop()

		hasSeenFirstKey ||= true
	}

	return schema({
		basis: "object",
		required,
		optional
	})
}

/**
 * Infers the contents of an object literal, ignoring a spread definition
 * You probably want to use {@link inferObjectLiteral} instead.
 */
type inferObjectLiteralInner<def extends object, $, args> = {
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
	-readonly [k in keyof def as optionalKeyFrom<k, def[k]>]?: inferDefinition<
		def[k] extends OptionalValue<infer inner> ? inner : def[k],
		$,
		args
	>
}

export type inferObjectLiteral<def extends object, $, args> = evaluate<
	"..." extends keyof def
		? merge<
				inferDefinition<def["..."], $, args>,
				inferObjectLiteralInner<def, $, args>
		  >
		: inferObjectLiteralInner<def, $, args>
>

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: k extends IndexedKey<infer indexDef>
		? validateString<indexDef, $, args> extends ErrorMessage<infer message>
			? // add a nominal type here to avoid allowing the error message as input
			  indexParseError<message>
			: inferDefinition<indexDef, $, args> extends PropertyKey
			  ? // if the indexDef is syntactically and semantically valid,
			    // move on to the validating the value definition
			    validateDefinition<def[k], $, args>
			  : indexParseError<writeInvalidPropertyKeyMessage<indexDef>>
		: k extends "..."
		  ? inferDefinition<def[k], $, args> extends object
				? validateDefinition<def[k], $, args>
				: indexParseError<writeInvalidSpreadTypeMessage<astToString<def[k]>>>
		  : validateObjectValue<def[k], $, args>
}

type nonOptionalKeyFrom<k extends PropertyKey, valueDef, $, args> = parseEntry<
	k,
	valueDef
> extends infer result extends EntryParseResult
	? result["kind"] extends "required"
		? result["innerKey"]
		: result["kind"] extends "indexed"
		  ? inferDefinition<result["innerKey"], $, args> & PropertyKey
		  : never
	: never

type optionalKeyFrom<k extends PropertyKey, valueDef> = parseEntry<
	k,
	valueDef
> extends infer result extends EntryParseResult<"optional">
	? result["innerKey"]
	: never

declare const indexParseSymbol: unique symbol

export type indexParseError<message extends string = string> = {
	[indexParseSymbol]: message
}

export const writeInvalidPropertyKeyMessage = <indexDef extends string>(
	indexDef: indexDef
): writeInvalidPropertyKeyMessage<indexDef> =>
	`Indexed key definition '${indexDef}' must be a string, number or symbol`

type writeInvalidPropertyKeyMessage<indexDef extends string> =
	`Indexed key definition '${indexDef}' must be a string, number or symbol`

export const writeInvalidSpreadTypeMessage = <def extends string>(
	def: def
): writeInvalidSpreadTypeMessage<def> =>
	`Spread operand must resolve to an object literal type (was ${def})`

type writeInvalidSpreadTypeMessage<def extends string> =
	`Spread operand must resolve to an object literal type (was ${def})`
