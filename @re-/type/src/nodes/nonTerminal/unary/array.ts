import { checkObjectKind } from "../../structural/common.js"
import type { Check } from "../../traverse/check/check.js"
import { Unary } from "./unary.js"

export namespace Arr {
    export const token = "[]"

    export type Token = typeof token

    export class Node extends Unary.Node<Token> {
        readonly token = token

        check(state: Check.State) {
            if (!checkObjectKind(this.toString(), "array", state)) {
                return
            }
            const rootData = state.data
            for (let i = 0; i < rootData.length; i++) {
                state.path.push(i)
                state.data = rootData[i] as any
                this.child.check(state)
                state.path.pop()
            }
            state.data = rootData
        }
    }
}
