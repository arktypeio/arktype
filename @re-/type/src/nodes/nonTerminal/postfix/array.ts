import type { Check } from "../../traverse/exports.js"
import { checkObjectKind } from "../structural/common.js"
import { Postfix } from "./postfix.js"

export namespace Arr {
    export const token = "[]"

    export type Token = typeof token

    export class Node extends Postfix.Node<Token> {
        readonly token = token

        protected check(state: Check.CheckState) {
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

        generate() {
            return []
        }
    }
}
