import { Evaluate, ListPossibleTypes, Narrow } from "@re-/tools"
import { InheritableMethodContext } from "../internal.js"

export * from "../internal.js"

export type KeywordHandler = {
    generate: (ctx: InheritableMethodContext<string, unknown>) => any
    validate: (
        valueType: unknown,
        ctx: InheritableMethodContext<string, unknown>
    ) => boolean
}

export type KeywordMap = Record<string, KeywordHandler>

export const defineKeywords = <T extends KeywordMap>(handlers: Narrow<T>) =>
    handlers as Evaluate<T>

export const listKeywords = <Handlers extends KeywordMap>(handlers: Handlers) =>
    Object.keys(handlers) as ListPossibleTypes<keyof Handlers>

export type HandledTypes<Handlers extends KeywordMap> = {
    [K in keyof Handlers]: ReturnType<Handlers[K]["generate"]>
}
