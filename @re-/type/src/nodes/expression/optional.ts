import type { Base } from "../base.js"
import { Expression } from "./expression.js"

export namespace Optional {
    export class Node extends Expression.Node<[Base.Node], [unknown, "?"]> {
        allows(data: unknown) {
            if (data === undefined) {
                return true
            }
        }

        toString() {
            return `${this.children[0].toString()}?` as const
        }

        toTuple(child: unknown) {
            return [child, "?"] as const
        }

        get description() {
            return `optional ${this.children[0].description}` as const
        }

        get checks() {
            return "optional" as const
        }
    }
}
