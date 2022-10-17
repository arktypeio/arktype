import type { Base } from "../../base.js"
import type { TraversalState } from "../../traversal/traversal.js"
import { jsKeywords } from "./js.js"
import { numberSubtypeKeywords, stringSubtypeKeywords } from "./subtype.js"
import { tsKeywords } from "./ts.js"
import { typeKeywords } from "./type.js"

export const keywords = {
    ...tsKeywords,
    ...jsKeywords,
    ...typeKeywords,
    ...stringSubtypeKeywords,
    ...numberSubtypeKeywords
}

export namespace Keyword {
    export type Definition = keyof Nodes

    export type Infer<definition extends Definition> = Inferences[definition]

    type Nodes = typeof keywords

    type Inferences = {
        [K in Definition]: Nodes[K]["traverse"] extends (
            data: unknown
        ) => data is TraversalState<infer T>
            ? T
            : never
    }

    export const isTopType = (
        node: Base.Node
    ): node is Nodes["any" | "unknown"] =>
        node === keywords.any || node === keywords.unknown
}
