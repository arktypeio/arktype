import type { SpaceRoot } from "../space.js"
import type { dictionary } from "../utils/dynamicTypes.js"

export type DynamicParserContext = {
    path: string
    spaceRoot: SpaceRoot
    seen: dictionary<string>
}

// TODO: How much of this do we need?
export const initializeParserContext = (spaceRoot: SpaceRoot) => ({
    spaceRoot,
    path: "",
    seen: {}
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
