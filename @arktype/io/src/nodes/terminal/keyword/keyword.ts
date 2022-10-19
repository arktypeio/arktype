import type { Base } from "../../base/base.js"
import type { TraversalState } from "../../traversal/traversal.js"
import { numberSubtypeKeywords, stringSubtypeKeywords } from "./subtype.js"
import { typeKeywords } from "./type.js"

export const keywords = {
    ...typeKeywords,
    ...stringSubtypeKeywords,
    ...numberSubtypeKeywords
}

export namespace Keyword {
    export type Definition = keyof Nodes

    export type Infer<definition extends Definition> = Inferences[definition]

    type Nodes = typeof keywords

    type Inferences = {
        [K in Definition]: Nodes[K]["allows"] extends (
            state: TraversalState
        ) => state is TraversalState<infer T>
            ? T
            : never
    }

    export const isTopType = (
        node: Base.Node
    ): node is Nodes["any" | "unknown"] =>
        node === keywords.any || node === keywords.unknown
}
