import type { Base } from "../nodes/base.js"
import type { Space } from "../space/parse.js"
import type { SpaceRoot } from "../space/root.js"
import type { TypeOptions } from "../type.js"

export type ParseContext = Space.Definition

export type parseContext = TypeOptions & {
    path: string[]
    space?: SpaceRoot
}

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
    context: parseContext
) => Base.node

export class parseError extends Error {}

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export type ParseError<Message extends string> = `!${Message}`
