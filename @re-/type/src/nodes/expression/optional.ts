import type { Check } from "../traverse/check/check.js"
import { Postfix } from "./expression.js"

export namespace Optional {
    export const token = "?"

    export type Token = typeof token

    export class Node extends Postfix.Node<Token> {
        readonly token = token

        check(state: Check.State) {
            if (state.data === undefined) {
                return
            }
            this.child.check(state)
        }
    }
}
