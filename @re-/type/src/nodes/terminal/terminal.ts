import { Base } from "../base.js"

export namespace Terminal {
    export abstract class Node<
        Kind extends string,
        Definition extends string
    > extends Base.Node<Kind, undefined> {
        children: undefined
        hasStructure = false

        abstract definition: Definition

        toString() {
            return this.definition
        }

        get ast() {
            return this.definition
        }
    }
}
