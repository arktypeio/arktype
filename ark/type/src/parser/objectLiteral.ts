import type { Dict, error, evaluate, mutable } from "@arktype/util"
import { node } from "../nodes/parse.js"
import { PredicateNode } from "../nodes/predicate/predicate.js"
import { DomainNode } from "../nodes/primitive/domain.js"
import type { NamedPropsInput } from "../nodes/prop/props.js"
import { PropsNode } from "../nodes/prop/props.js"
import { TypeNode } from "../nodes/type.js"
import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { validateString } from "./semantic/validate.js"
import { Scanner } from "./string/shift/scanner.js"
import { isArray } from "util"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext) => {
	const named: mutable<NamedPropsInput> = {}
	const symbols = Object.getOwnPropertySymbols(def).reduce(
		(data, sym) => ({
			sym: def[sym],
			...data
		}),
		{}
	)
	parseDefinition(def, named, ctx)
	parseDefinition(symbols, named, ctx)
	// TODO: meta
	return node({ basis: "object", props: named }, ctx)
}
const parseDefinition = (
	def: Dict,
	named: mutable<NamedPropsInput>,
	ctx: ParseContext
) => {
	for (const definitionKey in def) {
		const key = checkForOptionalAndTrimData(definitionKey, false)
		ctx.path.push(key.data as string)
		const keyDef = checkForOptionalAndTrimData(def[definitionKey], key.optional)
		const definition = ctx.scope.parse(keyDef.data, ctx)

		named[key.data as string] = {
			prerequisite: false,
			value: definition,
			optional: keyDef.optional
		}
		ctx.path.pop()
	}
}
export const checkForOptionalAndTrimData = (
	data: unknown,
	optional = false
): { data: unknown; optional: boolean } => {
	let trimmedData = data
	if (Array.isArray(data)) {
		if (data.length === 2 && data[1] === "?") {
			trimmedData = data[0]
			optional = true
		}
	} else if (typeof data === "string" && data[data.length - 1] === "?") {
		if (data[data.length - 2] === Scanner.escapeToken) {
			trimmedData = `${data.slice(0, -2)}?`
		} else {
			trimmedData = data.slice(0, -1)
			optional = true
		}
	}
	return {
		data: trimmedData,
		optional
	}
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

type nonOptionalKeyFrom<k, valueDef, $, args> = parseKeyDef<
	parseKey<k>,
	valueDef
> extends {
	kind: infer kind extends "required" | "indexed"
	value: infer value
	valueDef: unknown
}
	? (kind extends "required" ? value : inferDefinition<value, $, args>) &
			PropertyKey
	: never

type optionalKeyFrom<k, valueDef> = parseKeyDef<parseKey<k>, valueDef> extends {
	kind: "optional"
	value: infer value extends string | symbol
	valueDef: unknown
}
	? value
	: never

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: k extends IndexedKey<infer indexDef>
		? validateString<indexDef, $, args> extends error<infer message>
			? // add a nominal type here to avoid allowing the error message as input
			  indexParseError<message>
			: inferDefinition<indexDef, $, args> extends PropertyKey
			? // if the indexDef is syntactically and semantically valid,
			  // move on to the validating the value definition
			  validateDefinition<def[k], $, args>
			: indexParseError<writeInvalidPropertyKeyMessage<indexDef>>
		: def[k] extends OptionalValue<infer extractedDef>
		? validateDefinition<extractedDef, $, args>
		: validateDefinition<def[k], $, args>
}

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

type ParsedKeyKind = "required" | "optional" | "indexed"

type KeyParseResult = {
	kind: ParsedKeyKind
	value: string | symbol
}

export type IndexedKey<def extends string = string> = `[${def}]`

export type OptionalKey<name extends string = string> = `${name}?`

export type OptionalValue<value> = `${value & string}?` | readonly [value, "?"]

type parsedKey<result extends KeyParseResult> = result

type parseKeyDef<
	keyParseResult extends KeyParseResult,
	definition
> = definition extends OptionalValue<infer def>
	? parsedKey<{
			kind: "optional"
			value: keyParseResult["value"]
			valueDef: def
	  }>
	: parsedKey<{
			kind: keyParseResult["kind"]
			value: keyParseResult["value"]
			valueDef: definition
	  }>

type parseKey<k> = k extends OptionalKey<infer inner>
	? inner extends `${infer baseName}${Scanner.EscapeToken}`
		? {
				kind: "required"
				value: OptionalKey<baseName>
		  }
		: {
				kind: "optional"
				value: inner
		  }
	: k extends IndexedKey<infer def>
	? {
			kind: "indexed"
			value: def
	  }
	: k extends `${Scanner.EscapeToken}${infer escapedIndexKey extends
			IndexedKey}`
	? {
			kind: "required"
			value: escapedIndexKey
	  }
	: {
			kind: "required"
			value: k & (string | symbol)
	  }
