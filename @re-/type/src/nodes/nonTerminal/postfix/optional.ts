import type { Check } from "../../traverse/exports.js"
import { Postfix } from "./postfix.js"

export namespace Optional {
    export const token = "?"

    export type Token = typeof token

    export class Node extends Postfix.Node<Token> {
        readonly token = token

        check(state: Check.CheckState) {
            if (state.data === undefined) {
                return
            }
            this.child.check(state)
        }

        generate() {
            return undefined
        }
    }
}
