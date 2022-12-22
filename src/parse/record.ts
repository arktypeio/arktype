import type { TypeNode } from "../nodes/node.js"
import type { PropsRule } from "../nodes/rules/props.js"
import type { ScopeRoot } from "../scope.js"
import type { Dict, evaluate, mutable } from "../utils/generics.js"
import type { inferDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { Scanner } from "./shift/scanner.js"

export const parseRecord = (def: Dict, scope: ScopeRoot): TypeNode => {
    const props: mutable<PropsRule> = {}
    for (const definitionKey in def) {
        const propNode = parseDefinition(def[definitionKey], scope)
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

export type inferRecord<
    def extends Dict,
    scope extends Dict,
    aliases,
    input extends boolean
> = evaluate<
    {
        [requiredKeyName in requiredKeyOf<def>]: inferDefinition<
            def[withPossiblePreviousEscapeCharacter<requiredKeyName>],
            scope,
            aliases,
            input
        >
    } & {
        [optionalKeyName in optionalKeyOf<def>]?: inferDefinition<
            def[`${optionalKeyName}?`],
            scope,
            aliases,
            input
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
