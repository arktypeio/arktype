import type { Attributes } from "../../attributes/attributes.js"
import type { ParseError, parseFn, ParserContext } from "../common.js"
import type { Root } from "../root.js"
import type { Operand } from "../str/operand/operand.js"
import type { Scanner } from "../str/state/scanner.js"

export type TupleExpression = [unknown, Scanner.OperatorToken, ...unknown[]]

export const isTupleExpression = (def: unknown[]): def is TupleExpression =>
    (def[1] as any) in {}

export const parseTupleExpression: parseFn<TupleExpression> = (
    [definition, token, ...args],
    context
) => ({} as Attributes)

export type parseTupleExpression<
    Def extends TupleExpression,
    Ctx extends ParserContext
> = Def[1] extends Scanner.InfixToken
    ? Def[2] extends undefined
        ? [
              Root.parse<Def[0], Ctx>,
              ParseError<Operand.buildMissingRightOperandMessage<Def[1], "">>
          ]
        : [Root.parse<Def[0], Ctx>, Def[1], Root.parse<Def[2], Ctx>]
    : [Root.parse<Def[0], Ctx>, Def[1]]
