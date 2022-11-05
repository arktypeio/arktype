import type { SpaceRoot } from "../space.js"

export type DynamicParserContext = {
    path: string
    spaceRoot: SpaceRoot
}

// TODO: How much of this do we need?
export const initializeParserContext = (
    spaceRoot: SpaceRoot
): DynamicParserContext => ({
    spaceRoot,
    path: ""
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
