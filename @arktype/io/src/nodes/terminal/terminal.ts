import { Base } from "../base.js"

export namespace Terminal {
    export abstract class Node extends Base.Node {
        children: undefined
        definitionRequiresStructure = false

        abstract readonly definition: string
        next = undefined

        toString() {
            return this.definition
        }

        get ast() {
            return this.definition
        }
    }
}
