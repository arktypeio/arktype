import { DomainNode } from "../nodes/basis/domain.js"
import type { NamedPropRule } from "../nodes/constraints/props/named.js"
import { propsNode } from "../nodes/constraints/props/props.js"
import { predicateNode } from "../nodes/predicate.js"
import { typeNode } from "../nodes/type.js"
import type { evaluate } from "../utils/generics.js"
import type { Dict } from "../utils/records.js"
import type { inferDefinition, ParseContext } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"

export const parseRecord = (def: Dict, ctx: ParseContext) => {
    const named: NamedPropRule[] = []
    for (const definitionKey in def) {
        let keyName = definitionKey
        let optional = false
        if (definitionKey[definitionKey.length - 1] === "?") {
            if (
                definitionKey[definitionKey.length - 2] === Scanner.escapeToken
            ) {
                keyName = `${definitionKey.slice(0, -2)}?`
            } else {
                keyName = definitionKey.slice(0, -1)
                optional = true
            }
        }
        ctx.path.push(keyName)
        named.push({
            key: keyName,
            prerequisite: false,
            optional,
            value: parseDefinition(def[definitionKey], ctx)
        })
        ctx.path.pop()
    }
    const props = propsNode(named)
    const predicate = predicateNode([objectBasisNode, props])
    return typeNode([predicate])
}

const objectBasisNode = DomainNode("object")

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
