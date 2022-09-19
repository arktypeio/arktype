import type { Base } from "../nodes/base.js"
import type { SpaceMeta } from "../space.js"
import type { TypeOptions } from "../type.js"

export type parseContext = TypeOptions & {
    path: string[]
    space?: SpaceMeta
}

// Space is passed through an internal-only param, so we add
// it to the provided options to create a context.
export const initializeParseContext = (
    options: TypeOptions,
    space: SpaceMeta | undefined
) => ({
    ...options,
    space,
    path: []
})

export type parseFn<DefType = unknown> = (
    def: DefType,
    ctx: parseContext
) => Base.node

export class parseError extends Error {}

export const throwParseError = (message: string) => {
    throw new parseError(message)
}

export type ParseError<Message extends string> = `!${Message}`

export type ParseOptions = {
    onCycle?: unknown
    onResolve?: unknown
}
