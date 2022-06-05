import { ModelConfig } from "../model.js"

export type ParseContext = {
    path: string[]
    seen: string[]
    shallowSeen: string[]
    config: ModelConfig
    stringRoot: string | null
}

export const defaultParseContext: ParseContext = {
    config: {
        space: {
            dictionary: {},
            config: {}
        }
    },
    path: [],
    seen: [],
    shallowSeen: [],
    stringRoot: null
}

export type ParseFunction<T> = (def: T, ctx: ParseContext) => BaseNode<T>

export abstract class BaseNode<T> {
    constructor(protected def: T, protected ctx: ParseContext) {}

    abstract validate(value: unknown): boolean
    abstract generate(): unknown
}

export interface ParentNode<T extends Parent, Parent> {
    matches: (def: Parent, ctx: ParseContext) => def is T
    parse: (def: T, ctx: ParseContext) => BaseNode<T>
}

export type BaseNodeClass<T extends Parent, Parent> = (new (
    def: T,
    ctx: ParseContext
) => BaseNode<T>) & {
    matches: (def: Parent) => def is T
}
