import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { validateString } from "./semantic/validate.js"
import { IndexedKey, OptionalValue, parseKeyValueEntry, parsedEntry, validateObjectValue } from "./shared.js"
import type {parseEntry} from "./shared.js"
import {
    type Dict,
    type error,
    type evaluate,
    type mutable
} from "@arktype/util"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext) => {
	const named: mutable<NamedPropsInput> = {}
	const parseObjectValues = (
		def: Dict,
		named: mutable<NamedPropsInput>,
		ctx: ParseContext
	) => {
		for (const definitionKey in def) {
			addKeyValuePairToNamed(def, definitionKey, named, ctx)
		}
		const symbols = Object.getOwnPropertySymbols(def)
		for (const symbol of symbols) {
			addKeyValuePairToNamed(def, symbol, named, ctx)
		}
	}
	// TODO: meta
	return node({ basis: "object", props: named }, ctx)
}

const addKeyValuePairToNamed = (
    def: Dict,
    definitionKey: string | symbol,
    named: mutable<NamedPropsInput>,
    ctx: ParseContext
) => {
    const { innerKey, innerValue, optional } = parseKeyValueEntry(
        definitionKey,
        def[definitionKey]
    )
    ctx.path.push(innerKey as string)
    const definition = ctx.scope.parse(innerValue, ctx)

    named[innerKey as string] = {
        prerequisite: false,
        value: definition,
        optional
    }
    ctx.path.pop()
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
        -readonly [k in keyof def as optionalKeyFrom<
            k,
            def[k]
        >]?: inferDefinition<
            def[k] extends OptionalValue<infer inner> ? inner : def[k],
            $,
            args
        >
    }
>

type nonOptionalKeyFrom<k extends PropertyKey, valueDef, $, args> = parseEntry<
    k,
    valueDef
> extends parsedEntry<{
    kind: infer kind extends "required" | "indexed"
    innerKey: infer value extends string | symbol
    innerValue: unknown
}>
    ? (kind extends "required" ? value : inferDefinition<value, $, args>) &
          PropertyKey
    : never

type optionalKeyFrom<k extends PropertyKey, valueDef> = parseEntry<
    k,
    valueDef
> extends parsedEntry<{
    kind: "optional"
    innerKey: infer value extends string | symbol
    innerValue: unknown
}>
    ? value
    : never

export type validateObjectLiteral<def, $, args> = {
		[k in keyof def]: k extends IndexedKey<infer indexDef>
			? validateString<indexDef, $, args> extends error<infer message>
				? message
				: inferDefinition<indexDef, $, args> extends PropertyKey
				? // if the indexDef is syntactically and semantically valid,
				  // move on to the validating the value definition
				  validateDefinition<def[k], $, args>
				: writeInvalidPropertyKeyMessage<indexDef>
			: validateObjectValue<def[k], $, args>
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


