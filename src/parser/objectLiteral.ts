import type { Dict, error, evaluate, mutable } from "@arktype/utils"
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

export const parseObjectLiteral = (def: Dict, ctx: ParseContext) => {
	const named: mutable<NamedPropsInput> = {}
	for (const definitionKey in def) {
		let keyName = definitionKey
		let optional = false
		if (definitionKey[definitionKey.length - 1] === "?") {
			if (definitionKey[definitionKey.length - 2] === Scanner.escapeToken) {
				keyName = `${definitionKey.slice(0, -2)}?`
			} else {
				keyName = definitionKey.slice(0, -1)
				optional = true
			}
		}
		ctx.path.push(keyName)
		named[keyName] = {
			prerequisite: false,
			optional,
			value: ctx.scope.parse(def[definitionKey], ctx)
		}
		ctx.path.pop()
	}
	// TODO: meta
	return node({ basis: "object", props: named }, ctx)
}

export type inferObjectLiteral<def extends object, $, args> = evaluate<
	{
		// since def is a const parameter, we remove the readonly modifier here
		// support for builtin readonly tracked here:
		// https://github.com/arktypeio/arktype/issues/808
		-readonly [k in keyof def as nonOptionalKeyFrom<
			k,
			$,
			args
		>]: inferDefinition<def[k], $, args>
	} & {
		-readonly [k in keyof def as optionalKeyFrom<k>]?: inferDefinition<
			def[k],
			$,
			args
		>
	}
>

type nonOptionalKeyFrom<k, $, args> = parseKey<k> extends {
	kind: infer kind extends "required" | "indexed"
	value: infer value
}
	? (kind extends "required" ? value : inferDefinition<value, $, args>) &
			PropertyKey
	: never

type optionalKeyFrom<k> = parseKey<k> extends {
	kind: "optional"
	value: infer value extends string
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
	value: string
}

export type IndexedKey<def extends string = string> = `[${def}]`

export type OptionalKey<name extends string = string> = `${name}?`

type parsedKey<result extends KeyParseResult> = result

type parseKey<k> = k extends OptionalKey<infer inner>
	? inner extends `${infer baseName}${Scanner.EscapeToken}`
		? parsedKey<{
				kind: "required"
				value: OptionalKey<baseName>
		  }>
		: parsedKey<{
				kind: "optional"
				value: inner
		  }>
	: k extends IndexedKey<infer def>
	? parsedKey<{
			kind: "indexed"
			value: def
	  }>
	: k extends `${Scanner.EscapeToken}${infer escapedIndexKey extends
			IndexedKey}`
	? parsedKey<{
			kind: "required"
			value: escapedIndexKey
	  }>
	: parsedKey<{
			kind: "required"
			value: k & string
	  }>
