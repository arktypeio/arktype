import type { Base } from "../nodes/base.js"
import type { Nary } from "../nodes/nonTerminal/nary/nary.js"
import type { SpaceRoot } from "../scopes/space.js"
import type { InternalTypeOptions, TypeOptions } from "../scopes/type.js"

export type ParserContext = {
    aliases: unknown
}

export type parserContext = TypeOptions & {
    path: string[]
    space?: SpaceRoot
}

// TODO: Mutation okay?
export const initializeParserContext = (opts: InternalTypeOptions = {}) => {
    const ctx = opts as parserContext
    ctx.path = []
    return ctx
}

export type parseFn<DefType = unknown> = (
    def: DefType,
    context: parserContext
) => Base.node

export class parseError extends Error {}

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export type ParseError<Message extends string> = `!${Message}`

export type MaybeAppend<
    T,
    MaybeArray extends unknown[] | undefined
> = MaybeArray extends unknown[] ? [...MaybeArray, T] : T

export type MissingRightOperandMessage<Token extends Nary.Token> =
    `Token '${Token}' requires a right operand.`

export const missingRightOperandMessage = <Token extends Nary.Token>(
    token: Token
): MissingRightOperandMessage<Token> =>
    `Token '${token}' requires a right operand.`
