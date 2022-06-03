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

export { BaseNode as TerminalNode }

export abstract class NonTerminalNode<T> extends BaseNode<T> {
    abstract next(): BaseNode<T>
    abstract validate(value: unknown): boolean
    abstract generate(): unknown
}
