import type { TypeNode } from "../nodes/node.ts"
import type { PropsRule } from "../nodes/rules/props.ts"
import type { Resolver } from "../scope.ts"
import type { Dict, evaluate, mutable } from "../utils/generics.ts"
import type { inferDefinition } from "./definition.ts"
import { parseDefinition } from "./definition.ts"
import { Scanner } from "./string/shift/scanner.ts"

export const parseRecord = (def: Dict, $: Resolver): TypeNode => {
    const props: mutable<PropsRule> = {}
    for (const definitionKey in def) {
        const propNode = parseDefinition(def[definitionKey], $)
        if (definitionKey.endsWith(`${Scanner.escapeToken}?`)) {
            props[`${definitionKey.slice(0, -2)}?`] = propNode
        } else if (definitionKey.endsWith("?")) {
            props[definitionKey.slice(0, -1)] = ["?", propNode]
        } else {
            props[definitionKey] = propNode
        }
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
    name: name,
    isOptional: isOptional
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
}[keyof def]

type requiredKeyOf<def> = {
    [k in keyof def]: parseKey<k> extends KeyParseResult<infer name, false>
        ? name
        : never
}[keyof def]
