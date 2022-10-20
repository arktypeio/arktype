import type { Base } from "../base/base.js"

export namespace Terminal {
    export abstract class Node implements Base.Node {
        definitionRequiresStructure = false

        children: undefined
        abstract readonly definition: string
        abstract description: string
        abstract kind: string
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
}
