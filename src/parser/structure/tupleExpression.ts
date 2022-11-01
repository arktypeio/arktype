import type { Attributes } from "../../attributes/shared.js"
import type {
    DynamicParserContext,
    ParseError,
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
    context: DynamicParserContext
) => ({} as Attributes)

export type parseTupleExpression<
    def extends TupleExpression,
    context extends StaticParserContext
> = def[1] extends Scanner.InfixToken
    ? def[2] extends undefined
        ? [
              Root.parse<def[0], context>,
              ParseError<Operand.buildMissingRightOperandMessage<def[1], "">>
          ]
        : [Root.parse<def[0], context>, def[1], Root.parse<def[2], context>]
    : [Root.parse<def[0], context>, def[1]]
