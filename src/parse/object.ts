import { intersection } from "../nodes/intersection.js"
import { morph } from "../nodes/morph.js"
import type { Node } from "../nodes/node.js"
import { union } from "../nodes/union.js"
import type { ScopeRoot } from "../scope.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type {
    List,
    Dictionary,
    error,
    evaluate,
    keySet,
    mutable
} from "../utils/generics.js"
import { isKeyOf } from "../utils/generics.js"
import { hasType } from "../utils/typeOf.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { Scanner } from "./reduce/scanner.js"
import { buildMissingRightOperandMessage } from "./shift/operand/unenclosed.js"

export const parseDict = (def: Dictionary, scope: ScopeRoot): Node => {
    const props: mutable<Dictionary<Node>> = {}
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
        children: {
            props,
            requiredKeys
        }
    }
}

export type inferRecord<
    def extends Dictionary,
    scope extends Dictionary,
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

export const parseTuple = (def: List, scope: ScopeRoot): Node => {
    if (isTupleExpression(def)) {
        return parseTupleExpression(def, scope)
    }
    const props: Record<number, Node> = {}
    for (let i = 0; i < def.length; i++) {
        props[i] = parseDefinition(def[i], scope)
    }
    return {
        type: "object",
        subtype: "Array",
        children: {
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

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName<infer name> ? name : never
}[keyof def]

type requiredKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName ? never : k
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

const parseTupleExpression = (def: TupleExpression, scope: ScopeRoot) => {
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
    hasType(def, "object", "Array") &&
    hasType(def[1], "string") &&
    def[1] in tupleExpressionTokens
