import { Constraints } from "../nodes/constraints.ts"
import { NamedPropNode } from "../nodes/props.ts"
import type { PropKind, PropsRule } from "../nodes/props.ts"
import { Type } from "../type.ts"
import type { Dict, evaluate, mutable } from "../utils/generics.ts"
import type { inferDefinition, ParseContext } from "./definition.ts"
import { parseDefinition } from "./definition.ts"
import { Scanner } from "./string/shift/scanner.ts"

export const parseRecord = (def: Dict, ctx: ParseContext) => {
    const named: mutable<PropsRule["named"]> = {}
    for (const definitionKey in def) {
        let keyName = definitionKey
        let kind: PropKind = "required"
        if (definitionKey[definitionKey.length - 1] === "?") {
            if (
                definitionKey[definitionKey.length - 2] === Scanner.escapeToken
            ) {
                keyName = `${definitionKey.slice(0, -2)}?`
            } else {
                keyName = definitionKey.slice(0, -1)
                kind = "optional"
            }
        }
        ctx.path.push(keyName)
        named[keyName] = new NamedPropNode({
            kind,
            value: parseDefinition(def[definitionKey], ctx)
        })
        ctx.path.pop()
    }
    return Type.from({ domain: "object", props: "" })
}

type withPossiblePreviousEscapeCharacter<k> = k extends `${infer name}?`
    ? `${name}${Scanner.EscapeToken}?`
    : k

export type inferRecord<def extends Dict, $> = evaluate<
    {
        [requiredKeyName in requiredKeyOf<def>]: inferDefinition<
            def[withPossiblePreviousEscapeCharacter<requiredKeyName>],
            $
        >
    } & {
        [optionalKeyName in optionalKeyOf<def>]?: inferDefinition<
            def[`${optionalKeyName}?`],
            $
        >
    }
>

type KeyParseResult<name extends string, isOptional extends boolean> = [
    name,
    isOptional
]

type parseKey<k> = k extends optionalKeyWithName<infer name>
    ? name extends `${infer baseName}${Scanner.EscapeToken}`
        ? [`${baseName}?`, false]
        : [name, true]
    : [k, false]

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<def> = {
    [k in keyof def]: parseKey<k> extends KeyParseResult<infer name, true>
        ? name
        : never
}[keyof def] &
    // ensure keyof is fully evaluated for inferred types
    unknown

type requiredKeyOf<def> = {
    [k in keyof def]: parseKey<k> extends KeyParseResult<infer name, false>
        ? name
        : never
}[keyof def] &
    unknown
