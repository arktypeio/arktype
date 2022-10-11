import { Base } from "../../common.js"
import type { Arr } from "./array.js"
import type { Optional } from "./optional.js"

export namespace Postfix {
    export type Token = Optional.Token | Arr.Token

    export abstract class Node<
        Token extends Postfix.Token,
        Child extends Base.Node = Base.Node
    > extends Base.Node {
        abstract token: Token

        constructor(protected child: Child) {
            super([child], child.hasStructure)
        }

        toString() {
            return `${this.child.toString()}${this.token}` as const
        }

        toAst() {
            return [this.child.toAst(), this.token] as const
        }

        toDefinition() {
            return this.hasStructure
                ? ([this.child.toDefinition(), this.token] as const)
                : this.toString()
        }
    }
}
