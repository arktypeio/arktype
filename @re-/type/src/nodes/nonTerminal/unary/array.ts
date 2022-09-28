import { checkObjectRoot } from "../../structs/struct.js"
import type { Check } from "../../traverse/exports.js"
import { Unary } from "./unary.js"

export namespace Array {
    export const token = "[]"

    export type Token = typeof token

    export class Node extends Unary.Node<Token> {
        readonly token = token

        protected check(state: Check.CheckState) {
            if (!checkObjectRoot(this.toString(), "array", state)) {
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

        generate() {
            return []
        }
    }
}
