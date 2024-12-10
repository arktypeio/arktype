import type {
	BaseParseContext,
	BaseRoot,
	UndeclaredKeyBehavior
} from "@ark/schema"
import {
	isArray,
	type anyOrNever,
	type ErrorMessage,
	type ErrorType,
	type typeToString
} from "@ark/util"
import type { validateString } from "./ast/validate.ts"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import type {
	ParsedKeyKind,
	writeInvalidSpreadTypeMessage
} from "./objectLiteral.ts"
import type { parseString } from "./string.ts"

export type ParsedPropertyKind = "plain" | "optional" | "defaultable"

export type ParsedProperty =
	| ParsedRequiredProperty
	| ParsedOptionalProperty
	| ParsedDefaultableProperty

export type ParsedRequiredProperty = {
	kind: "plain"
	valueNode: BaseRoot
}

export type ParsedOptionalProperty = {
	kind: "optional"
	valueNode: BaseRoot
}

export type ParsedDefaultableProperty = {
	kind: "defaultable"
	valueNode: BaseRoot
	default: unknown
}

export const parseProperty = (
	def: unknown,
	ctx: BaseParseContext
): ParsedProperty => {
	if (isArray(def)) {
		if (def[1] === "=") {
			return {
				kind: "defaultable",
				valueNode: ctx.$.parseOwnDefinitionFormat(def[0], ctx),
				default: def[2]
			}
		}

		if (def[1] === "?") {
			return {
				kind: "optional",
				valueNode: ctx.$.parseOwnDefinitionFormat(def[0], ctx)
			}
		}
	}

	return {
		kind: "plain",
		valueNode: ctx.$.parseOwnDefinitionFormat(def, ctx)
	}
}

export type validateProperty<def, keyKind extends ParsedKeyKind, $, args> =
	[def] extends [anyOrNever] ?
		/** this extra [anyOrNever] check is required to ensure that nested `type` invocations
		 * like the following are not prematurely validated by the outer call:
		 *
		 * ```ts
		 * type({
		 * 	"test?": type("string").pipe(x => x === "true")
		 * })
		 * ```
		 */
		def
	: keyKind extends "spread" ?
		validateSpread<def, inferDefinition<def, $, args>, $, args>
	: keyKind extends "undeclared" ? UndeclaredKeyBehavior
	: keyKind extends "required" ? validateDefinition<def, $, args>
	: // check to ensure we don't have an optional or defaultable value on
	// an already optional or index key
	def extends OptionalPropertyDefinition ?
		ErrorMessage<invalidOptionalKeyKindMessage>
	: def extends DefaultablePropertyTuple ?
		ErrorMessage<invalidDefaultableKeyKindMessage>
	: def extends PossibleDefaultableStringDefinition ?
		validatePossibleStringDefault<
			def,
			$,
			args,
			invalidDefaultableKeyKindMessage
		>
	:	validateDefinition<def, $, args>

export type validatePossibleStringDefault<
	def extends string,
	$,
	args,
	errorMessage extends string
> =
	parseString<def, $, args> extends DefaultablePropertyTuple ?
		ErrorMessage<errorMessage>
	:	validateString<def, $, args>

type validateSpread<def, inferredProperty, $, args> =
	inferredProperty extends object ? validateDefinition<def, $, args>
	:	ErrorType<writeInvalidSpreadTypeMessage<typeToString<inferredProperty>>>

export type OptionalPropertyDefinition<baseDef = unknown> =
	| OptionalPropertyTuple<baseDef>
	| OptionalPropertyString<baseDef & string>

export type OptionalPropertyString<baseDef extends string = string> =
	`${baseDef}?`

export type OptionalPropertyTuple<baseDef = unknown> = readonly [baseDef, "?"]

// a precise type for a defaultable string definition
// isn't possible due to arbitrary whitespace surrounding "=",
// so that must be checked by parsing and testing if
// the root is a DefaultablePropertyTuple
export type PossibleDefaultableStringDefinition = `${string}=${string}`

export type DefaultablePropertyTuple<
	baseDef = unknown,
	thunkableProperty = unknown
> = readonly [baseDef, "=", thunkableProperty]

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidOptionalKeyKindMessage = `Only required keys may make their values optional, e.g. { [mySymbol]: ['number', '?'] }`

export type invalidOptionalKeyKindMessage = typeof invalidOptionalKeyKindMessage

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidDefaultableKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

export type invalidDefaultableKeyKindMessage =
	typeof invalidDefaultableKeyKindMessage
