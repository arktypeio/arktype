import type { InternalAttributes } from "../../attributes/attributes.js"
import type {
    ParseError,
    ParserContext,
    StaticParserContext
} from "../common.js"
import type { Root } from "../root.js"
import type { Operand } from "../string/operand/operand.js"
import type { Scanner } from "../string/state/scanner.js"

export type TupleExpression = [unknown, Scanner.OperatorToken, ...unknown[]]

export const isTupleExpression = (def: unknown[]): def is TupleExpression =>
    (def[1] as any) in {}

export const parseTupleExpression = (
    [definition, token, ...args]: TupleExpression,
    context: ParserContext
) => ({} as InternalAttributes)

export type parseTupleExpression<
    Def extends TupleExpression,
    Ctx extends StaticParserContext
> = Def[1] extends Scanner.InfixToken
    ? Def[2] extends undefined
        ? [
              Root.parse<Def[0], Ctx>,
              ParseError<Operand.buildMissingRightOperandMessage<Def[1], "">>
          ]
        : [Root.parse<Def[0], Ctx>, Def[1], Root.parse<Def[2], Ctx>]
    : [Root.parse<Def[0], Ctx>, Def[1]]
