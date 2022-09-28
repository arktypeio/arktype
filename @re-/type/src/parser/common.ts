import { keySet } from "@re-/tools"
import type { Base } from "../nodes/base.js"
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
// Space is passed through an internal-only param, so we add
// it to the provided options to create a context.
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

// TODO: Better way to organize tokens
export const metaTokens = keySet({
    ";": 1,
    "=>": 1,
    "[]": 1,
    "?": 1,
    "|": 1,
    "&": 1,
    ":": 1
})

export type BinaryToken = BranchingToken | "=>"

export type BranchingToken = "|" | "&"

export type TypelessToken = ":"

export type MetaToken = keyof typeof metaTokens

export type MissingRightOperandMessage<Token extends BinaryToken> =
    `Token '${Token}' requires a right operand.`

export const missingRightOperandMessage = <Token extends BinaryToken>(
    token: Token
): MissingRightOperandMessage<Token> =>
    `Token '${token}' requires a right operand.`
