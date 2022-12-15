import { intersection } from "../nodes/intersection.js"
import { morph } from "../nodes/morph.js"
import type { TypeNode } from "../nodes/node.js"
import { union } from "../nodes/union.js"
import type { ScopeRoot } from "../scope.js"
import { inDomain } from "../utils/domainOf.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type {
    Dictionary,
    error,
    evaluate,
    keySet,
    List,
    mutable
} from "../utils/generics.js"
import { isKeyOf } from "../utils/generics.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { Scanner } from "./reduce/scanner.js"
import { buildMissingRightOperandMessage } from "./shift/operand/unenclosed.js"

export const parseDict = (def: Dictionary, scope: ScopeRoot): TypeNode => {
    const props: mutable<Dictionary<TypeNode>> = {}
    const requiredKeys: mutable<keySet> = {}
    for (const definitionKey in def) {
        let keyName = definitionKey
        if (definitionKey.endsWith("~?")) {
            keyName = `${definitionKey.slice(0, -2)}?`
            requiredKeys[keyName] = true
        } else if (definitionKey.endsWith("?")) {
            keyName = definitionKey.slice(0, -1)
        } else {
            requiredKeys[definitionKey] = true
        }
        props[keyName] = parseDefinition(def[definitionKey], scope)
    }
    return {
        object: {
            props,
            requiredKeys
        }
    }
}

type withEscapeCharacter<k> = k extends `${infer name}?` ? `${name}~?` : k

export type inferRecord<
    def extends Dictionary,
    scope extends Dictionary,
    aliases
> = evaluate<
    {
        [requiredKeyName in requiredKeyOf<def>]: inferDefinition<
            def[withEscapeCharacter<requiredKeyName>],
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

export const parseTuple = (def: List, scope: ScopeRoot): TypeNode => {
    if (isTupleExpression(def)) {
        return parseTupleExpression(def, scope)
    }
    const props: Record<number, TypeNode> = {}
    for (let i = 0; i < def.length; i++) {
        props[i] = parseDefinition(def[i], scope)
    }
    return {
        object: {
            kind: "Array",
            props
        }
    }
}

export type inferTuple<
    def,
    scope extends Dictionary,
    aliases
> = def extends TupleExpression
    ? inferTupleExpression<def, scope, aliases>
    : {
          [i in keyof def]: inferDefinition<def[i], scope, aliases>
      }

type KeyParseResult<name extends string, isOptional extends boolean> = [
    name: name,
    isOptional: isOptional
]

type parseKey<k> = k extends optionalKeyWithName<infer name>
    ? name extends `${infer baseName}~`
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

export type validateTupleExpression<
    def extends TupleExpression,
    scope extends Dictionary
> = def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? error<buildMissingRightOperandMessage<def[1], "">>
        : [
              validateDefinition<def[0], scope>,
              def[1],
              validateDefinition<def[2], scope>
          ]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], scope>, "[]"]
    : never

type inferTupleExpression<
    def extends TupleExpression,
    scope extends Dictionary,
    aliases
> = def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? never
        : def[1] extends "&"
        ? evaluate<
              inferDefinition<def[0], scope, aliases> &
                  inferDefinition<def[2], scope, aliases>
          >
        :
              | inferDefinition<def[0], scope, aliases>
              | inferDefinition<def[2], scope, aliases>
    : def[1] extends "[]"
    ? inferDefinition<def[0], scope, aliases>[]
    : never

const parseTupleExpression = (
    def: TupleExpression,
    scope: ScopeRoot
): TypeNode => {
    if (isKeyOf(def[1], Scanner.branchTokens)) {
        if (def[2] === undefined) {
            return throwParseError(buildMissingRightOperandMessage(def[1], ""))
        }
        const l = parseDefinition(def[0], scope)
        const r = parseDefinition(def[2], scope)
        return def[1] === "&" ? intersection(l, r, scope) : union(l, r, scope)
    }
    if (def[1] === "[]") {
        return morph("array", parseDefinition(def[0], scope))
    }
    return throwInternalError(`Unexpected tuple expression token '${def[1]}'`)
}

const tupleExpressionTokens = {
    "|": true,
    "&": true,
    "[]": true
} as const

type TupleExpressionToken = keyof typeof tupleExpressionTokens

export type TupleExpression = [unknown, TupleExpressionToken, ...unknown[]]

const isTupleExpression = (def: List): def is TupleExpression =>
    inDomain(def[1], "string") && def[1] in tupleExpressionTokens
