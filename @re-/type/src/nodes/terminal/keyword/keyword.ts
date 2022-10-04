import { ConstraintKeyword } from "./constraint.js"
import { RegexKeyword } from "./regex.js"
import { TypeKeyword } from "./types/typeKeyword.js"

export namespace Keyword {
    export type Definition =
        | TypeKeyword.Definition
        | RegexKeyword.Definition
        | ConstraintKeyword.Definition

    type InferredAs = TypeKeyword.InferredAs & {
        [K in RegexKeyword.Definition]: string
    } & { [K in ConstraintKeyword.Definition]: number }

    export const nodes = {
        ...TypeKeyword.nodes,
        ...RegexKeyword.nodes,
        ...ConstraintKeyword.nodes
    }

    export type Infer<Def extends Definition> = InferredAs[Def]

    export const matches = (token: string): token is Definition =>
        token in nodes

    export const getNode = (def: Definition) => nodes[def]
}
