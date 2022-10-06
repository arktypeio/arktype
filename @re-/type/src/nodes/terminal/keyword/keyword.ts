import { ConstrainedKeyword } from "./constrained.js"
import { RegexKeyword } from "./regex.js"
import { TypeKeyword } from "./types/typeKeyword.js"

export namespace Keyword {
    export type Definition =
        | TypeKeyword.Definition
        | RegexKeyword.Definition
        | ConstrainedKeyword.Definition

    export type StringTyped = "string" | RegexKeyword.Definition

    export type NumberTyped = "number" | ConstrainedKeyword.Definition

    type InferredAs = TypeKeyword.InferredAs & {
        [K in RegexKeyword.Definition]: string
    } & { [K in ConstrainedKeyword.Definition]: number }

    export const nodes = {
        ...TypeKeyword.nodes,
        ...RegexKeyword.nodes,
        ...ConstrainedKeyword.nodes
    }

    export type Infer<Def extends Definition> = InferredAs[Def]

    export const matches = (token: string): token is Definition =>
        token in nodes

    export const getNode = (def: Definition) => nodes[def]
}
