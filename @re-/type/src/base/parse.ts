import type { MetaDefinitions, SpaceMeta } from "../space.js"
import type { Create, Node, Validate } from "./base.js"

export type Fn<DefType = unknown> = (def: DefType, ctx: Context) => Node

export type InferenceContext = {
    dict: unknown
    meta: MetaDefinitions
    seen: Record<string, true>
}

/** Maps aliases to their definitions or to nodes parsed from their definitions */
export type ResolutionMap = Record<string, unknown>

export type TypeOptions = {
    validate?: Validate.Options
    create?: Create.Options
}

export class ParseError extends Error {}

export type Context = {
    path: string
    cfg: TypeOptions
    space: SpaceMeta | undefined
    shallowSeen: string[]
}

export const createContext = (
    cfg: TypeOptions = {},
    space?: SpaceMeta
): Context => {
    return {
        path: "",
        shallowSeen: [],
        cfg,
        space
    }
}
