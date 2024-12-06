import {
	ArkErrors,
	writeUnassignableDefaultValueMessage,
	type BaseParseContext,
	type BaseRoot
} from "@ark/schema"
import {
	isArray,
	printable,
	throwParseError,
	type anyOrNever,
	type conform,
	type ErrorMessage
} from "@ark/util"
import type { DefaultFor } from "../attributes.ts"
import type { type } from "../keywords/keywords.ts"
import type { validateDefinition } from "./definition.ts"

export type validateDefaultableValue<def, k extends keyof def, $, args> =
	[def[k]] extends [anyOrNever] ?
		/** this extra [anyOrNever] check is required to ensure that nested `type` invocations
		 * like the following are not prematurely validated by the outer call:
		 *
		 * ```ts
		 * type({
		 * 	"test?": type("string").pipe(x => x === "true")
		 * })
		 * ```
		 */
		def[k]
	: def[k] extends DefaultValueTuple ?
		validateDefaultValueTuple<def[k], k, $, args>
	: def[k] extends OptionalValueTuple ?
		readonly [validateDefinition<def[k][0], $, args>, "?"]
	:	validateDefinition<def[k], $, args>

type validateDefaultValueTuple<
	def extends DefaultValueTuple,
	k extends PropertyKey,
	$,
	args
> =
	parseKey<k>["kind"] extends "required" ?
		conform<
			def,
			readonly [
				validateDefinition<def[0], $, args>,
				"=",
				DefaultFor<type.infer.In<def[0], $, args>>
			]
		>
	:	ErrorMessage<invalidDefaultKeyKindMessage>

export type DefaultValueTuple<
	baseDef = unknown,
	thunkableValue = unknown
> = readonly [baseDef, "=", thunkableValue]

export type OptionalValueTuple<baseDef = unknown> = readonly [baseDef, "?"]

export type ParsedValue =
	| ParsedBaseValue
	| ParsedOptionalValue
	| ParsedDefaultValue

type ParsedBaseValue = {
	kind: "raw"
	node: BaseRoot
}

type ParsedOptionalValue = {
	kind: "optional"
	node: BaseRoot
}

type ParsedDefaultValue = {
	kind: "default"
	node: BaseRoot
	value: unknown
}

export const parsePropertyValue = (
	value: unknown,
	ctx: BaseParseContext
): ParsedValue => {
	if (!isArray(value) || (value[0] !== "=" && value[0] !== "?"))
		return { kind: "raw", node: ctx.$.parseOwnDefinitionFormat(value, ctx) }

	const parsedValue = ctx.$.parseOwnDefinitionFormat(value[0], ctx)

	if (value[1] === "?") {
		return {
			kind: "optional",
			node: parsedValue
		}
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

	return {
		kind: "default",
		node: parsedValue,
		value: value[2]
	}
}
