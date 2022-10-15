import { keySet } from "@re-/tools"
import { Base } from "../../base.js"

export namespace Unary {
    export const tokens = keySet({
        "?": 1,
        "[]": 1,
        "%": 1
    })

    export type Token = keyof typeof tokens

    export abstract class Node extends Base.Node {
        definitionRequiresStructure: boolean

        constructor(public child: Base.Node) {
            super()
            this.definitionRequiresStructure = child.definitionRequiresStructure
        }

        abstract tupleWrap(
            next: unknown
        ): readonly [left: unknown, token: Token, right?: unknown]

        get ast() {
            return this.tupleWrap(this.child.ast)
        }

        get definition() {
            return this.definitionRequiresStructure
                ? this.tupleWrap(this.child.definition)
                : this.toString()
        }
    }
}
