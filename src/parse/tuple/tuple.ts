import { intersection } from "../../nodes/intersection.ts"
import { functorKeywords } from "../../nodes/keywords.ts"
import type { TypeNode } from "../../nodes/node.ts"
import { union } from "../../nodes/union.ts"
import type { Scope } from "../../scope.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { error, evaluate, List } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import { buildMissingRightOperandMessage } from "../string/shift/operand/unenclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { validateRefinementTuple } from "./refinement.ts"
import { parseRefinementTuple } from "./refinement.ts"

export const parseTuple = (def: List, scope: Scope): TypeNode => {
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

// TODO: flat tuple expressions
export type validateTupleExpression<
    def extends TupleExpression,
    scope extends Scope
> = def[1] extends "=>"
    ? validateRefinementTuple<def[0], scope>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? [def[0], error<buildMissingRightOperandMessage<def[1], "">>]
        : [
              validateDefinition<def[0], scope>,
              def[1],
              validateDefinition<def[2], scope>
          ]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], scope>, "[]"]
    : never

export type inferTuple<
    def extends List,
    scope extends Scope
> = def extends TupleExpression
    ? inferTupleExpression<def, scope>
    : {
          [i in keyof def]: inferDefinition<def[i], scope>
      }

type inferTupleExpression<
    def extends TupleExpression,
    scope extends Scope
> = def[1] extends "=>"
    ? inferDefinition<def[0], scope>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? never
        : def[1] extends "&"
        ? evaluate<
              inferDefinition<def[0], scope> & inferDefinition<def[2], scope>
          >
        : inferDefinition<def[0], scope> | inferDefinition<def[2], scope>
    : def[1] extends "[]"
    ? inferDefinition<def[0], scope>[]
    : never

// TODO: spread ("...")
export type TupleExpressionToken = "&" | "|" | "[]" | "=>"

export type TupleExpressionParser<token extends TupleExpressionToken> = (
    def: TupleExpression<token>,
    scope: Scope
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
    "=>": parseRefinementTuple
}

const parseTupleExpression = (def: TupleExpression, scope: Scope): TypeNode =>
    tupleExpressionParsers[def[1]](def as any, scope)

const isTupleExpression = (def: List): def is TupleExpression =>
    typeof def[1] === "string" && def[1] in tupleExpressionParsers

export type TupleExpression<
    token extends TupleExpressionToken = TupleExpressionToken
> = [unknown, token, ...unknown[]]
