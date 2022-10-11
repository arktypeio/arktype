import type { Check } from "../../traverse/check.js"
import { Unary } from "./unary.js"

export namespace Optional {
    export const token = "?"

    export type Token = typeof token

    export class Node extends Unary.Node {
        allows(state: Check.State) {
            if (state.data === undefined) {
                return
            }
            this.child.allows(state)
        }

        toString() {
            return `${this.child.toString()}?` as const
        }

        toAst() {
            return [this.child.toAst(), "?"] as const
        }

        toDefinition() {
            return this.hasStructure
                ? ([this.child.toDefinition(), "?"] as const)
                : this.toString()
        }

        toDescription() {
            return `optional ${this.child.toDescription()}` as const
        }
    }
}
