import type {
	BaseParseContext,
	BaseRoot,
	UndeclaredKeyBehavior
} from "@ark/schema"
import {
	isArray,
	type anyOrNever,
	type ErrorType,
	type typeToString
} from "@ark/util"
import type { inferDefinition, validateDefinition } from "./definition.ts"
import type {
	ParsedKeyKind,
	writeInvalidSpreadTypeMessage
} from "./objectLiteral.ts"

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
	: validateDefinition<def, $, args, keyKind>

type validateSpread<def, inferredProperty, $, args> =
	inferredProperty extends object ? validateDefinition<def, $, args, null>
	:	ErrorType<writeInvalidSpreadTypeMessage<typeToString<inferredProperty>>>

export type OptionalPropertyDefinition<baseDef = unknown> =
	| OptionalPropertyTuple<baseDef>
	| OptionalPropertyString<baseDef & string>

export type OptionalPropertyString<baseDef extends string = string> =
	`${baseDef}?`

export type OptionalPropertyTuple<baseDef = unknown> = readonly [baseDef, "?"]

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidOptionalKeyKindMessage = `Only required keys may make their values optional, e.g. { [mySymbol]: ['number', '?'] }`

export type invalidOptionalKeyKindMessage = typeof invalidOptionalKeyKindMessage

// single quote use here is better for TypeScript's inlined error to avoid escapes
export const invalidDefaultableKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

export type invalidDefaultableKeyKindMessage =
	typeof invalidDefaultableKeyKindMessage
