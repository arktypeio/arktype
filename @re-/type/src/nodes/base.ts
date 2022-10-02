import type { Check } from "./traverse/check/check.js"

export namespace Base {
    export type Node = {
        children?: Node[]
        check(state: Check.State): void
        toAst(): unknown
        toDefinition(): unknown
        toString(): string
    }
}
