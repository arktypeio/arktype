import type { ResolvedNode } from "../nodes/node.js"
import type { PropsRule } from "../nodes/rules/props.js"

import type { Dict, evaluate, mutable } from "../utils/generics.js"
import type { inferDefinition, ParseContext } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"

export const parseRecord = (def: Dict, ctx: ParseContext): ResolvedNode => {
    const props: mutable<PropsRule> = {}
    for (const definitionKey in def) {
        let keyName = definitionKey
        let isOptional = false
        if (definitionKey[definitionKey.length - 1] === "?") {
            if (
                definitionKey[definitionKey.length - 2] === Scanner.escapeToken
            ) {
                keyName = `${definitionKey.slice(0, -2)}?`
            } else {
                keyName = definitionKey.slice(0, -1)
                isOptional = true
            }
        }
        ctx.path.push(keyName)
        const propNode = parseDefinition(def[definitionKey], ctx)
        ctx.path.pop()
        props[keyName] = isOptional ? ["?", propNode] : propNode
    }
    return {
        object: {
            props
        }
    }
}

type withPossiblePreviousEscapeCharacter<k> = k extends `${infer name}?`
    ? `${name}${Scanner.EscapeToken}?`
    : k

export type inferRecord<def extends Dict, $> = evaluate<
    {
        [requiredKeyName in keyof def as requiredKeyName extends optionalKeyOf<def>
            ? never
            : requiredKeyName]: inferDefinition<
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
