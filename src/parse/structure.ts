import type { Node } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import type { array, record } from "../utils/dataTypes.js"
import { throwInternalError } from "../utils/errors.js"
import type { evaluate, keySet, mutable } from "../utils/generics.js"
import type { inferDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import type { Scanner } from "./reduce/scanner.js"

export const parseRecord = (def: record, scope: ScopeRoot): Node => {
    const props: mutable<record<Node>> = {}
    const requiredKeys: mutable<keySet> = {}
    for (const definitionKey in def) {
        let keyName = definitionKey
        if (definitionKey.endsWith("?")) {
            keyName = definitionKey.slice(0, -1)
        } else {
            requiredKeys[definitionKey] = true
        }
        props[keyName] = parseDefinition(def[definitionKey], scope)
    }
    return {
        type: "object",
        props,
        requiredKeys
    }
}

export type inferRecord<
    def extends record,
    scope extends record,
    aliases
> = evaluate<
    {
        [requiredKeyName in requiredKeyOf<def>]: inferDefinition<
            def[requiredKeyName],
            scope,
            aliases
        >
    } & {
        [optionalKeyName in optionalKeyOf<def>]?: inferDefinition<
            def[`${optionalKeyName}?`],
            scope,
            aliases
        >
    }
>

export const parseTuple = (def: array, scope: ScopeRoot): Node => {
    if (isTupleExpression(def)) {
        return parseTupleExpression(def, scope)
    }
    const props: mutable<record<Node>> = {}
    const requiredKeys: Record<number, true> = {}
    for (let i = 0; i < def.length; i++) {
        props[i] = parseDefinition(def[i], scope)
        requiredKeys[i] = true
    }
    return {
        type: "object",
        subtype: "array",
        props,
        requiredKeys
    }
}

export type inferTuple<def, scope extends record, aliases> = {
    [i in keyof def]: inferDefinition<def[i], scope, aliases>
}

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName<infer name> ? name : never
}[keyof def]

type requiredKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName ? never : k
}[keyof def]

const parseTupleExpression = (
    expression: TupleExpression,
    scope: ScopeRoot
) => {
    return throwInternalError("Not yet implemented.")
}

// type parseTupleExpression<
//     def extends TupleExpression,
//     scope extends record
// > = def[1] extends Scanner.InfixToken
//     ? def[2] extends undefined
//         ? [
//               parseRoot<def[0], scope>,
//               error<buildMissingRightOperandMessage<def[1], "">>
//           ]
//         : [parseRoot<def[0], scope>, def[1], parseRoot<def[2], scope>]
//     : [parseRoot<def[0], scope>, def[1]]

type TupleExpression = [unknown, Scanner.OperatorToken, ...unknown[]]

const isTupleExpression = (def: unknown): def is TupleExpression =>
    Array.isArray(def) && (def[1] as any) in {}
