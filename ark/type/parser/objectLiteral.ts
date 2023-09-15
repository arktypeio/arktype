import { node } from "@arktype/schema"
import { type Dict, type ErrorMessage, type evaluate } from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { validateString } from "./semantic/validate.js"
import type {
	EntryParseResult,
	IndexedKey,
	OptionalValue,
	parseEntry,
	validateObjectValue
} from "./shared.js"
import { type } from "../scopes/ark.js"

const stringAndSymbolicEntriesOf = (o: Record<string | symbol, unknown>) => [
	...Object.entries(o),
	...Object.getOwnPropertySymbols(o).map((k) => [k, o[k]] as const)
]

export const parseObjectLiteral = (def: Dict, ctx: ParseContext) => {
	// const named: mutable<NamedPropsInput> = {}
	// for (const entry of stringAndSymbolicEntriesOf(def)) {
	// 	const { innerKey, innerValue, kind } = parseEntry(entry, "required")
	// 	ctx.path.push(innerKey as string)
	// 	const valueNode = ctx.scope.parse(innerValue, ctx)
	// 	named[innerKey] = {
	// 		prerequisite: false,
	// 		value: valueNode,
	// 		optional: kind === "optional"
	// 	}
	// 	ctx.path.pop()
	// }
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

// as k extends `[${infer tail}${"]" | ""}`
// ? tail extends `${string}]`
// 	? k
// 	: `[${validateString<tail, $, args>}]`
// : k

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

// const t = type({
// 	"[string ]": "string"
// })

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
