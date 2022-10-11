import type { Check } from "../../traverse/check.js"
import { Unary } from "./unary.js"

export namespace Arr {
    export const token = "[]"

    export type Token = typeof token

    export class Node extends Unary.Node {
        readonly token = token

        allows(state: Check.State) {
            if (!Structure.checkKind(this, "array", state)) {
                return
            }
        }

        toString() {
            return `${this.child.toString()}[]` as const
        }

        toAst() {
            return [this.child.toAst(), "[]"] as const
        }

        toDefinition() {
            return this.hasStructure
                ? ([this.child.toDefinition(), "[]"] as const)
                : this.toString()
        }

        toDescription() {
            return `${this.child.toDescription()} array`
        }
    }
}
