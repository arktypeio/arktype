import { intersection } from "../nodes/intersection.js"
import { morph } from "../nodes/morph.js"
import type {
    TypeNode,
    TypeTree,
    UnknownDomain,
    UnknownRule
} from "../nodes/node.js"
import { union } from "../nodes/union.js"
import { resolveIfIdentifier } from "../nodes/utils.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/classify.js"
import { hasObjectDomain, subclassify } from "../utils/classify.js"
import { throwParseError } from "../utils/errors.js"
import type {
    Dictionary,
    error,
    evaluate,
    keySet,
    List,
    mutable
} from "../utils/generics.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import type { Scanner } from "./reduce/scanner.js"
import { buildMissingRightOperandMessage } from "./shift/operand/unenclosed.js"

export const parseDict = (def: Dictionary, scope: ScopeRoot): TypeNode => {
    const props: mutable<Dictionary<TypeNode>> = {}
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
        object: {
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
    def extends List,
    scope extends Dictionary,
    aliases
> = def extends UnknownTupleExpression
    ? inferTupleExpression<def, scope, aliases>
    : {
          [i in keyof def]: inferDefinition<def[i], scope, aliases>
      }

export type validateTuple<
    def extends List,
    scope extends Dictionary
> = def extends UnknownTupleExpression
    ? validateTupleExpression<def, scope>
    : {
          [i in keyof def]: validateDefinition<def[i], scope>
      }

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName<infer name> ? name : never
}[keyof def]

type requiredKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName ? never : k
}[keyof def]

type validateTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dictionary
> = def[1] extends ":"
    ? validateConstraintTuple<def[0], scope>
    : def[1] extends Scanner.BranchToken
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

type validateConstraintTuple<def, scope extends Dictionary> = [
    validateDefinition<def, scope>,
    ":",
    ConstraintFunction<inferDefinition<def, scope, scope>>
]

type inferTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dictionary,
    aliases
> = def[1] extends ":"
    ? inferDefinition<def[0], scope, aliases>
    : def[1] extends Scanner.BranchToken
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

export type TupleExpressionToken = "&" | "|" | "[]" | ":"

type TupleExpressionParser<token extends TupleExpressionToken> = (
    def: UnknownTupleExpression<token>,
    scope: ScopeRoot
) => TypeNode

const parseBranchTuple: TupleExpressionParser<"|" | "&"> = (def, scope) => {
    if (def[2] === undefined) {
        return throwParseError(buildMissingRightOperandMessage(def[1], ""))
    }
    const l = parseDefinition(def[0], scope)
    const r = parseDefinition(def[2], scope)
    return def[1] === "&" ? intersection(l, r, scope) : union(l, r, scope)
}

const buildMalformedConstraintMessage = (constraint: unknown) =>
    `Constraint tuple must include a functional right operand (got ${subclassify(
        constraint
    )})`

const parseConstraintTuple: TupleExpressionParser<":"> = (def, scope) => {
    if (!hasObjectDomain(def[2], "Function")) {
        return throwParseError(buildMalformedConstraintMessage(":"))
    }
    const constrained = parseDefinition(def[0], scope)
    const constraintPredicate = {
        constrain: def[2] as ConstraintFunction
    } satisfies UnknownRule
    const distributedConstraint: mutable<UnknownDomain> = {}
    let domain: Domain
    for (domain in resolveIfIdentifier(constrained, scope)) {
        distributedConstraint[domain] = constraintPredicate
    }
    return intersection(constrained, distributedConstraint as TypeTree, scope)
}

const parseArrayTuple: TupleExpressionParser<"[]"> = (def, scope) =>
    morph("array", parseDefinition(def[0], scope))

const tupleExpressionParsers: {
    [token in TupleExpressionToken]: TupleExpressionParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    ":": parseConstraintTuple
}

const parseTupleExpression = (
    def: UnknownTupleExpression,
    scope: ScopeRoot
): TypeNode => tupleExpressionParsers[def[1]](def as any, scope)

const isTupleExpression = (def: List): def is UnknownTupleExpression =>
    typeof def[1] === "string" && def[1] in tupleExpressionParsers

export type UnknownTupleExpression<
    token extends TupleExpressionToken = TupleExpressionToken
> = [unknown, token, ...unknown[]]

export type ConstraintFunction<data = unknown> = (data: data) => boolean
