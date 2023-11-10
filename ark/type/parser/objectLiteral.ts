import {
	node,
	type OptionalPropInner,
	type RequiredPropInner
} from "@arktype/schema"
import { type Dict, type ErrorMessage, type evaluate } from "@arktype/util"
import { stringify } from "@arktype/util"
import type { ParseContext } from "../scope.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import type { validateString } from "./semantic/validate.ts"
import { parseEntry } from "./shared.ts"
import type {
	EntryParseResult,
	IndexedKey,
	OptionalValue,
	validateObjectValue
} from "./shared.ts"

const stringAndSymbolicEntriesOf = (o: Record<string | symbol, unknown>) => [
	...Object.entries(o),
	...Object.getOwnPropertySymbols(o).map((k) => [k, o[k]] as const)
]

export const parseObjectLiteral = (def: Dict, ctx: ParseContext) => {
	const required: RequiredPropInner[] = []
	const optional: OptionalPropInner[] = []
	for (const entry of stringAndSymbolicEntriesOf(def)) {
		const result = parseEntry(entry)
		ctx.path.push(
			`${
				typeof result.innerKey === "symbol"
					? `[${stringify(result.innerKey)}]`
					: result.innerKey
			}`
		)
		const valueNode = ctx.scope.parse(result.innerValue, ctx)
		if (result.kind === "optional") {
			optional.push({
				optional: result.innerKey,
				value: valueNode
			})
		} else {
			required.push({
				required: result.innerKey,
				value: valueNode
			})
		}
		ctx.path.pop()
	}
	return node("object")
}

export type inferObjectLiteral<def extends object, $, args> = evaluate<
	{
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
