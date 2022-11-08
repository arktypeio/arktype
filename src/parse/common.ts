import type { SpaceRoot } from "../space.js"

export type DynamicParserContext = {
    spaceRoot: SpaceRoot
}

export const initializeParserContext = (
    spaceRoot: SpaceRoot
): DynamicParserContext => ({
    spaceRoot
})

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
