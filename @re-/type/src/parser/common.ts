import type { Dictionary } from "@re-/tools"
import type { Base } from "../nodes/common.js"
import type { Expression } from "../nodes/expression/expression.js"

export type ParserContext = {
    aliases: unknown
}

export type parserContext = {
    aliases: Dictionary
}

export type parseFn<DefType = unknown> = (
    def: DefType,
    ctx: parserContext
) => Base.Node

export class parseError extends Error {}

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export type ParseError<Message extends string> = `!${Message}`

export type MaybeAppend<T, MaybeArray> = MaybeArray extends unknown[]
    ? [...MaybeArray, T]
    : T

export type MissingRightOperandMessage<Token extends Expression.InfixToken> =
    `Token '${Token}' requires a right operand.`

export const missingRightOperandMessage = <Token extends Expression.InfixToken>(
    token: Token
): MissingRightOperandMessage<Token> =>
    `Token '${token}' requires a right operand.`
