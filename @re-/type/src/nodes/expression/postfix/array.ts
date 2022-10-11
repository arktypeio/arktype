import { ObjectKind } from "../../common.js"
import type { Check } from "../../traverse/check.js"
import { Postfix } from "./postfix.js"

export namespace Arr {
    export const token = "[]"

    export type Token = typeof token

    export class Node extends Postfix.Node<Token> {
        readonly token = token

        allows(state: Check.State) {
            if (!ObjectKind.check(this, "array", state)) {
                return false
            }
        }

        traverse(state: Check.State<any>) {
            const rootData = state.data
            for (let i = 0; i < rootData.length; i++) {
                state.path.push(String(i))
                state.data = rootData[i]
                this.child.allows(state)
                state.path.pop()
            }
            state.data = rootData
        }

        toDescription() {
            return `${this.child.toDescription()} array`
        }
    }
}
