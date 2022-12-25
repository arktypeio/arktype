import { intersection } from "../../nodes/intersection.ts"
import { functorKeywords } from "../../nodes/keywords.ts"
import type { TypeNode } from "../../nodes/node.ts"
import { union } from "../../nodes/union.ts"
import type { ScopeRoot } from "../../scope.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { error, evaluate, List } from "../../utils/generics.ts"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import { buildMissingRightOperandMessage } from "../string/shift/operand/unenclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { validateConstraintTuple } from "./constraint.ts"
import { parseConstraintTuple } from "./constraint.ts"

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
            subdomain: "Array",
            props
        }
    }
}

export type validateTupleExpression<
    def extends UnknownTupleExpression,
    c extends InferenceContext
> = def[1] extends ":"
    ? validateConstraintTuple<def[0], c>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? [def[0], error<buildMissingRightOperandMessage<def[1], "">>]
        : [validateDefinition<def[0], c>, def[1], validateDefinition<def[2], c>]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], c>, "[]"]
    : never

export type inferTuple<
    def extends List,
    c extends InferenceContext
> = def extends UnknownTupleExpression
    ? inferTupleExpression<def, c>
    : {
          [i in keyof def]: inferDefinition<def[i], c>
      }

type inferTupleExpression<
    def extends UnknownTupleExpression,
    c extends InferenceContext
> = def[1] extends ":"
    ? inferDefinition<def[0], c>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? never
        : def[1] extends "&"
        ? evaluate<inferDefinition<def[0], c> & inferDefinition<def[2], c>>
        : inferDefinition<def[0], c> | inferDefinition<def[2], c>
    : def[1] extends "[]"
    ? inferDefinition<def[0], c>[]
    : never

// TODO: spread ("...")
export type TupleExpressionToken = "&" | "|" | "[]" | ":"

export type TupleExpressionParser<token extends TupleExpressionToken> = (
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

const parseArrayTuple: TupleExpressionParser<"[]"> = (def, scope) =>
    functorKeywords.Array(parseDefinition(def[0], scope))

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
