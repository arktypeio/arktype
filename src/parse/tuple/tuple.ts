import { functorKeywords } from "../../nodes/keywords.ts"
import type { TypeNode } from "../../nodes/node.ts"
import { intersection, union } from "../../nodes/node.ts"
import type { ScopeRoot } from "../../scope.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { error, List, returnOf } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { inferIntersection, inferUnion } from "../string/ast.ts"
import { buildMissingRightOperandMessage } from "../string/shift/operand/unenclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { Out, validateMorphTuple } from "./morph.ts"
import { parseMorphTuple } from "./morph.ts"
import type { validateNarrowTuple } from "./narrow.ts"
import { parseNarrowTuple } from "./narrow.ts"

export const parseTuple = (def: List, $: ScopeRoot): TypeNode => {
    if (isTupleExpression(def)) {
        return parseTupleExpression(def, $)
    }
    const props: Record<number, TypeNode> = {}
    for (let i = 0; i < def.length; i++) {
        props[i] = parseDefinition(def[i], $)
    }
    return {
        object: {
            subdomain: ["Array", "unknown", def.length],
            props
        }
    }
}

export type validateTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "=>"
    ? validateMorphTuple<def, $>
    : def[1] extends ":"
    ? validateNarrowTuple<def, $>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? [def[0], error<buildMissingRightOperandMessage<def[1], "">>]
        : [validateDefinition<def[0], $>, def[1], validateDefinition<def[2], $>]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], $>, "[]"]
    : never

export type inferTuple<def extends List, $> = def extends TupleExpression
    ? inferTupleExpression<def, $>
    : {
          [i in keyof def]: inferDefinition<def[i], $>
      }

type inferTupleExpression<def extends TupleExpression, $> = def[1] extends ":"
    ? [unknown, 3] extends [def[2], keyof def]
        ? inferDefinition<def[3], $>
        : def[2] extends (data: any) => data is infer narrowed
        ? narrowed
        : inferDefinition<def[0], $>
    : def[1] extends "=>"
    ? (
          In: inferDefinition<def[0], $>
      ) => Out<
          [unknown, 3] extends [def[2], keyof def]
              ? inferDefinition<def[3], $>
              : returnOf<def[2]>
      >
    : def[1] extends "&"
    ? inferIntersection<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "|"
    ? inferUnion<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "[]"
    ? inferDefinition<def[0], $>[]
    : never

// TODO: instanceof
// TODO: === (exact value)
// TODO: = (Default value)
// TODO: Pipe
// TODO: Merge
export type TupleExpressionToken = "&" | "|" | "[]" | ":" | "=>"

export type TupleExpressionParser<token extends TupleExpressionToken> = (
    def: TupleExpression<token>,
    $: ScopeRoot
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
    ":": parseNarrowTuple,
    "=>": parseMorphTuple
}

const parseTupleExpression = (def: TupleExpression, $: ScopeRoot): TypeNode =>
    tupleExpressionParsers[def[1]](def as any, $)

const isTupleExpression = (def: List): def is TupleExpression =>
    typeof def[1] === "string" && def[1] in tupleExpressionParsers

export type TupleExpression<
    token extends TupleExpressionToken = TupleExpressionToken
> = [unknown, token, ...unknown[]]
