import { Base } from "../common.js"

export namespace Terminal {
    const children: never[] = []

    export abstract class Node<Definition extends string> extends Base.Node {
        constructor(public definition: Definition) {
            super(children, false)
        }

        toString() {
            return this.definition
        }

        get ast() {
            return this.definition
        }
    }
}
