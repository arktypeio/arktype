import type { Check } from "../../traverse/check.js"
import { Postfix } from "./postfix.js"

export namespace Arr {
    export const token = "[]"

    export type Token = typeof token

    export class Node extends Postfix.Node<Token> {
        readonly token = token

        allows(state: Check.State) {
            if (!Structure.checkKind(this, "array", state)) {
                return
            }
            const rootData = state.data
            for (let i = 0; i < rootData.length; i++) {
                state.path.push(String(i))
                state.data = rootData[i] as any
                this.child.allows(state)
                state.path.pop()
            }
            state.data = rootData
        }
    }
}
