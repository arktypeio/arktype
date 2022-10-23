import type { Base } from "../../base/base.js"
import { NumericKeyword } from "./numeric.js"
import { RegexKeyword } from "./regex.js"
import { TypeKeyword } from "./type.js"

export namespace Keyword {
    export const nodes = {
        ...TypeKeyword.nodes,
        ...RegexKeyword.nodes,
        ...NumericKeyword.nodes
    }

    export type Nodes = typeof nodes

    export type Kinds = {
        [K in `${keyof Nodes}Keyword`]: K extends `${infer OriginalName}Keyword`
            ? OriginalName extends keyof Nodes
                ? Nodes[OriginalName]
                : never
            : never
    }

    export type Definition = keyof Nodes

    export type Inferences = {
        [K in Definition]: Nodes[K]["traverse"] extends (
            traversal: Base.Traversal
        ) => traversal is Base.Traversal<infer T>
            ? T
            : never
    }

    // export const isTopType = (
    //     node: Base.Node
    // ): node is typeof typeKeywords["any"] | typeof typeKeywords["unknown"] =>
    //     node === keywords.any || node === keywords.unknown
}
