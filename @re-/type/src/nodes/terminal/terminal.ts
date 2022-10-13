import { Base } from "../base.js"

export namespace Terminal {
    const children: [] = []

    export abstract class Node<
        Kind extends string,
        Definition extends string
    > extends Base.Node<Kind, []> {
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
