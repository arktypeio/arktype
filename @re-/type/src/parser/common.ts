import type { Dictionary } from "@re-/tools"
import type { Base } from "../nodes/common.js"

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

export type maybePush<MaybeArray, T> = MaybeArray extends unknown[]
    ? [...MaybeArray, T]
    : T
