import { intersection } from "../nodes/intersection.js"
import { morph } from "../nodes/morph.js"
import type { TypeNode, TypeSet } from "../nodes/node.js"
import type { Predicate } from "../nodes/predicate.js"
import type { Validator } from "../nodes/rules/rules.js"
import { union } from "../nodes/union.js"
import { resolveIfIdentifier } from "../nodes/utils.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"
import { domainOf, hasKind } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { Dict, error, evaluate, List, mutable } from "../utils/generics.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { buildMissingRightOperandMessage } from "./shift/operand/unenclosed.js"
import type { Scanner } from "./shift/scanner.js"

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
    scope extends Dict,
    aliases
> = def extends UnknownTupleExpression
    ? inferTupleExpression<def, scope, aliases>
    : {
          [i in keyof def]: inferDefinition<def[i], scope, aliases>
      }

export type validateTuple<
    def extends List,
    scope extends Dict
> = def extends UnknownTupleExpression
    ? validateTupleExpression<def, scope>
    : {
          [i in keyof def]: validateDefinition<def[i], scope>
      }

type validateTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict
> = def[1] extends ":"
    ? validateNarrowTuple<def[0], scope>
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

type validateNarrowTuple<constrainedDef, scope extends Dict> = [
    validateDefinition<constrainedDef, scope>,
    ":",
    Validator<inferDefinition<constrainedDef, scope, scope>>
]

type inferTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict,
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
    `Constraint tuple must include a functional right operand (got ${domainOf(
        constraint
    )})`

const parseConstraintTuple: TupleExpressionParser<":"> = (def, scope) => {
    if (!hasKind(def[2], "Function")) {
        return throwParseError(buildMalformedConstraintMessage(":"))
    }
    const constrained = parseDefinition(def[0], scope)
    const constraintPredicate = {
        validator: def[2] as Validator
    } satisfies Predicate
    const distributedValidator: mutable<TypeSet> = {}
    let domain: Domain
    for (domain in resolveIfIdentifier(constrained, scope)) {
        distributedValidator[domain] = constraintPredicate
    }
    return intersection(constrained, distributedValidator, scope)
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
