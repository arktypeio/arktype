import { functorKeywords } from "../../nodes/keywords.ts"
import type { TypeNode } from "../../nodes/node.ts"
import { intersection, union } from "../../nodes/node.ts"
import type { ScopeRoot } from "../../scope.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { error, evaluate, List, returnOf } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import { buildMissingRightOperandMessage } from "../string/shift/operand/unenclosed.ts"
import type { Scanner } from "../string/shift/scanner.ts"
import type { out, validateMorphTuple } from "./morph.ts"
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
            subdomain: "Array",
            props
        }
    }
}

// TODO: flat tuple expressions
export type validateTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends ":"
    ? validateNarrowTuple<def[0], $>
    : def[1] extends "=>"
    ? validateMorphTuple<def[0], $>
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
    ? def[2] extends (In: any) => In is infer narrowed
        ? narrowed
        : inferDefinition<def[0], $>
    : def[1] extends "=>"
    ? $ extends out
        ? returnOf<def[2]>
        : inferDefinition<def[0], $>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? never
        : def[1] extends "&"
        ? evaluate<inferDefinition<def[0], $> & inferDefinition<def[2], $>>
        : inferDefinition<def[0], $> | inferDefinition<def[2], $>
    : def[1] extends "[]"
    ? inferDefinition<def[0], $>[]
    : never

// TODO: spread ("...")
// TODO: instanceof
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
