import type { Base } from "../base/base.js"
import type { Alias } from "./alias.js"
import type { Keyword } from "./keyword/keyword.js"
import type { Literal } from "./literal/literal.js"

export namespace Terminal {
    export abstract class Node implements Base.Node {
        readonly definitionRequiresStructure = false

        children: undefined
        abstract readonly definition: string
        abstract description: string
        abstract kind: Base.NodeKind
        abstract traverse(traversal: Base.Traversal): void

        get mustBe() {
            return this.description
        }

        toString() {
            return this.definition as this["definition"]
        }

        get ast() {
            return this.definition as this["definition"]
        }
    }

    export type Nodes = Keyword.Kinds & Literal.Kinds & { alias: Alias.Node }
}
