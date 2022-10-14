import type { Base } from "../../base.js"
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
        [K in Definition]: Nodes[K]["allows"] extends (
            data: unknown
        ) => data is infer T
            ? T
            : Parameters<Nodes[K]["allows"]>[0]
    }

    export const isTopType = (
        node: Base.Node
    ): node is Nodes["any" | "unknown"] =>
        node === keywords.any || node === keywords.unknown
}
