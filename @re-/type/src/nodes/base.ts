import type { parserContext } from "../parser/common.js"
import type { Check } from "./traverse/check/check.js"

export namespace Base {
    export type context = parserContext

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export abstract class node {
        abstract check(state: Check.State): void
        abstract toAst(): unknown
        abstract toIsomorphicDef(): unknown
        abstract toString(): string
    }
}
