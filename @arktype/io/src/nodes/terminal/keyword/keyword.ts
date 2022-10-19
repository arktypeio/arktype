import type { Base } from "../../base/base.js"
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
        [K in Definition]: Nodes[K]["traverse"] extends (
            traversal: Base.Traversal
        ) => traversal is Base.Traversal<infer T>
            ? T
            : never
    }

    export const isTopType = (
        node: Base.Node
    ): node is Nodes["any" | "unknown"] =>
        node === keywords.any || node === keywords.unknown
}
