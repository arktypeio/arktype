import type { parserContext } from "../parser/common.js"
import type { Check } from "./traverse/check/check.js"

export namespace Base {
    export type context = parserContext

    export type StringTree =
        | string
        | { readonly [K in string]: StringTree }
        | readonly StringTree[]

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export abstract class node {
        abstract check(state: Check.State): void
        abstract toAst(): StringTree
        abstract toDefinition(): StringTree
        abstract toString(): string
    }
}
