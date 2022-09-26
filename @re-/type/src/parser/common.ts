import type { Base } from "../nodes/base.js"
import type { SpaceRoot } from "../space/root.js"
import type { TypeOptions } from "../type.js"

export type ParserContext = {
    Aliases: unknown
}

export type parserContext = TypeOptions & {
    path: string[]
    space?: SpaceRoot
}

// TODO: Still needed?
// Space is passed through an internal-only param, so we add
// it to the provided options to create a context.
export const initializeParseContext = (
    options: TypeOptions,
    space: SpaceRoot | undefined
) => ({
    ...options,
    space,
    path: []
})

export type parseFn<DefType = unknown> = (
    def: DefType,
    context: parserContext
) => Base.node

export class parseError extends Error {}

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export type ParseError<Message extends string> = `!${Message}`
