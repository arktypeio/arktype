import type { SpaceRoot } from "../space.js"
import type { dictionary } from "../utils/dynamicTypes.js"
import type { AttributesByPath } from "./state/attributes.js"

export type DynamicParserContext = {
    attributes: AttributesByPath
    path: string
    spaceRoot: SpaceRoot
}

export const initializeParserContext = (
    spaceRoot: SpaceRoot
): DynamicParserContext => ({
    spaceRoot,
    path: "",
    attributes: {}
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
