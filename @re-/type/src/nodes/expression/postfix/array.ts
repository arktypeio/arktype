import { Structure } from "../../common.js"
import type { Check } from "../../traverse/check.js"
import { Postfix } from "./postfix.js"

export namespace Arr {
    export const token = "[]"

    export type Token = typeof token

    export type Ast = [unknown, Token]

    export class Node extends Postfix.Node<Token> {
        readonly token = token

        check(state: Check.State) {
            if (!Structure.checkKind(this, "array", state)) {
                return
            }
            const rootData = state.data
            for (let i = 0; i < rootData.length; i++) {
                state.path.push(String(i))
                state.data = rootData[i] as any
                this.child.check(state)
                state.path.pop()
            }
            state.data = rootData
        }
    }
}
