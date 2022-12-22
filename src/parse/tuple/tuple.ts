import { arrayOf } from "../../nodes/generics.js"
import { intersection } from "../../nodes/intersection.js"
import type { TypeNode } from "../../nodes/node.js"
import { union } from "../../nodes/union.js"
import type { ScopeRoot } from "../../scope.js"
import { throwParseError } from "../../utils/errors.js"
import type { Dict, error, evaluate, List } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import { buildMissingRightOperandMessage } from "../string/shift/operand/unenclosed.js"
import type { Scanner } from "../string/shift/scanner.js"
import type { validateMorphTuple } from "./morph.js"
import { parseMorphTuple } from "./morph.js"
import type { validateNarrowTuple } from "./narrow.js"
import { parseNarrowTuple } from "./narrow.js"
import type { validatePipeTuple } from "./pipe.js"

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

export type inferTuple<
    def extends List,
    scope extends Dict,
    aliases,
    input extends boolean
> = def extends UnknownTupleExpression
    ? inferTupleExpression<def, scope, aliases, input>
    : {
          [i in keyof def]: inferDefinition<def[i], scope, aliases, input>
      }

export type validateTuple<
    def extends List,
    scope extends Dict,
    input extends boolean
> = def extends UnknownTupleExpression
    ? validateTupleExpression<def, scope, input>
    : {
          [i in keyof def]: validateDefinition<def[i], scope, input>
      }

type validateTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict,
    input extends boolean
> = def[1] extends ":"
    ? validateNarrowTuple<def[0], scope, input>
    : def[1] extends "|>"
    ? validatePipeTuple<def[0], scope, input>
    : def[1] extends "=>"
    ? validateMorphTuple<def[0], def[2], scope, input>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? error<buildMissingRightOperandMessage<def[1], "">>
        : [
              validateDefinition<def[0], scope, input>,
              def[1],
              validateDefinition<def[2], scope, input>
          ]
    : def[1] extends "[]"
    ? [validateDefinition<def[0], scope, input>, "[]"]
    : never

type inferTupleExpression<
    def extends UnknownTupleExpression,
    scope extends Dict,
    aliases,
    input extends boolean
> = def[1] extends ":"
    ? // TODO: try condensing inference context
      inferDefinition<def[0], scope, aliases, input>
    : def[1] extends "|>"
    ? inferDefinition<def[0], scope, aliases, input>
    : def[1] extends "=>"
    ? input extends true
        ? inferDefinition<def[0], scope, aliases, input>
        : inferDefinition<def[2], scope, aliases, input>
    : def[1] extends Scanner.BranchToken
    ? def[2] extends undefined
        ? never
        : def[1] extends "&"
        ? evaluate<
              inferDefinition<def[0], scope, aliases, input> &
                  inferDefinition<def[2], scope, aliases, input>
          >
        :
              | inferDefinition<def[0], scope, aliases, input>
              | inferDefinition<def[2], scope, aliases, input>
    : def[1] extends "[]"
    ? inferDefinition<def[0], scope, aliases, input>[]
    : never

// TODO: Add default value
export type TupleExpressionToken = "&" | "|" | "[]" | ":" | "=>" | "|>"

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
    arrayOf(parseDefinition(def[0], scope))

const tupleExpressionParsers: {
    [token in TupleExpressionToken]: TupleExpressionParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    ":": parseNarrowTuple,
    "=>": parseMorphTuple,
    "|>": () => "never"
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
