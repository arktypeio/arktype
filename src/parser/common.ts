import type { dictionary } from "../internal.js"

export type DynamicParserContext = {
    aliases: dictionary
}

export type StaticParserContext = {
    aliases: unknown
}

export class parseError extends Error {}

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export type ParseError<Message extends string> = `!${Message}`

export type maybePush<MaybeArray, T> = MaybeArray extends unknown[]
    ? [...MaybeArray, T]
    : T
