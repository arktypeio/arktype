import { Base } from "../common.js"

export namespace Terminal {
    const children: never[] = []

    export abstract class Node<Def extends string> extends Base.Node {
        constructor(protected def: Def) {
            super(children, false)
        }

        toString() {
            return this.def
        }

        toAst() {
            return this.def
        }

        toDefinition() {
            return this.def
        }
    }
}
