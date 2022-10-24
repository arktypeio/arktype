import type { Base } from "../../nodes/base/base.js"
import type { Expression } from "../../nodes/expression/expression.js"

import type { ParseError, parseFn, ParserContext } from "../common.js"
import type { Root } from "../root.js"
import type { Operand } from "../str/operand/operand.js"

export type TupleExpression = [unknown, Expression.BaseToken, ...unknown[]]

export const isTupleExpression = (def: unknown[]): def is TupleExpression =>
    (def[1] as any) in {}

export const parseTupleExpression: parseFn<TupleExpression> = (
    [definition, token, ...args],
    context
) => ({} as Base.Node)

export type parseTupleExpression<
    Def extends TupleExpression,
    Ctx extends ParserContext
> = Def[1] extends Expression.BinaryToken
    ? Def[2] extends undefined
        ? [
              Root.parse<Def[0], Ctx>,
              ParseError<Operand.buildMissingRightOperandMessage<Def[1], "">>
          ]
        : [Root.parse<Def[0], Ctx>, Def[1], Root.parse<Def[2], Ctx>]
    : [Root.parse<Def[0], Ctx>, Def[1]]
